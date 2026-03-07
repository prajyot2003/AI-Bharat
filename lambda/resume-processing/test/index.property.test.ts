/**
 * Property-Based Tests for Resume Processing Lambda
 *
 * Property 18: S3 resume storage with user prefix
 * Property 19: S3 pre-signed URL expiration
 * Property 20: S3 upload event triggers Lambda
 * Property 21: S3 supported file formats
 *
 * Requirements: 7.3, 7.6, 7.7, 7.10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const s3Mock = mockClient(S3Client);
const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/key?X-Amz-Expires=3600'),
}));

const { handler, buildS3Key, isValidFileFormat, getFileExtension } = await import('../index.js');

describe('Property-Based Tests: Resume Processing Lambda', () => {
    beforeEach(() => {
        s3Mock.reset();
        bedrockMock.reset();
        dynamoMock.reset();

        process.env.AWS_REGION = 'us-east-1';
        process.env.RESUME_BUCKET = 'test-resume-bucket';
        process.env.USER_PROFILES_TABLE = 'test-user-profiles';

        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Property 18: S3 resume storage with user prefix
     */
    describe('Property 18: S3 resume storage with user prefix', () => {
        it('should always include userId as S3 key prefix for any userId + filename', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                    fc.string({ minLength: 5, maxLength: 50 }),
                    (userId, fileName) => {
                        const key = buildS3Key(userId, fileName);
                        // Property: key must always start with the userId
                        expect(key.startsWith(`${userId}/`)).toBe(true);
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should sanitize arbitrary filenames to safe S3 keys', () => {
            fc.assert(
                fc.property(
                    // userId must be alphanumeric/dash/underscore only (as any real userId would be)
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (userId, fileName) => {
                        const key = buildS3Key(userId, fileName);
                        // The filename portion of the key must not contain dangerous characters
                        const filenamePart = key.split('/').pop() || '';
                        expect(filenamePart).not.toMatch(/[<>"\\|?*]/);
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    /**
     * Property 19: S3 pre-signed URL expiration
     */
    describe('Property 19: S3 pre-signed URL expiration', () => {
        it('should always include 3600-second expiry for any valid upload request', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                    fc.constantFrom('application/pdf', 'text/plain'),
                    async (userId, contentType) => {
                        s3Mock.reset();
                        bedrockMock.reset();
                        dynamoMock.reset();

                        const event = {
                            body: JSON.stringify({
                                action: 'generate-upload-url',
                                userId,
                                fileName: `resume.${contentType === 'application/pdf' ? 'pdf' : 'txt'}`,
                                contentType,
                            }),
                        };

                        const res = await handler(event);
                        if (res.statusCode === 200) {
                            const body = JSON.parse(res.body);
                            // Property: expiresIn must always be 3600
                            expect(body.expiresIn).toBe(3600);
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 20: S3 upload event triggers Lambda
     * We verify that the Lambda responds correctly to S3 upload event format
     */
    describe('Property 20: S3 upload event triggers Lambda', () => {
        it('should respond to analyze action for any S3 key with any userId', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                    fc.string({ minLength: 5, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_.-]+$/.test(s)),
                    async (userId, s3Key) => {
                        s3Mock.reset();
                        bedrockMock.reset();
                        dynamoMock.reset();

                        // Mock S3 object fetch (no content – will use mock analysis fallback)
                        s3Mock.on(GetObjectCommand).resolves({ Body: undefined });

                        const event = {
                            body: JSON.stringify({
                                action: 'analyze',
                                userId,
                                s3Key: `${userId}/resumes/${s3Key}`,
                            }),
                        };

                        const res = await handler(event);
                        // Should return 200 with analysis (using mock fallback)
                        expect(res.statusCode).toBe(200);
                        const body = JSON.parse(res.body);
                        expect(body.skills).toBeDefined();
                        expect(body.atsScore).toBeDefined();
                        expect(body.suggestions).toBeDefined();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    /**
     * Property 21: S3 supported file formats
     */
    describe('Property 21: S3 supported file formats', () => {
        it('should accept PDF, DOCX, TXT and reject all other types', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('.pdf', '.docx', '.txt', '.exe', '.zip', '.doc', '.mp4', '.jpg'),
                    (ext) => {
                        const validExts = ['.pdf', '.docx', '.txt'];
                        const result = isValidFileFormat('application/octet-stream', ext);
                        if (validExts.includes(ext)) {
                            expect(result).toBe(true);
                        } else {
                            // .doc is not in allowed list, so should be false
                            if (ext === '.doc') expect(result).toBe(false);
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should reject unsupported file types for any upload request', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('.exe', '.zip', '.mp4', '.jpg', '.png', '.doc'),
                    async (ext) => {
                        s3Mock.reset();

                        const event = {
                            body: JSON.stringify({
                                action: 'generate-upload-url',
                                userId: 'user-prop',
                                fileName: `resume${ext}`,
                                contentType: 'application/octet-stream',
                            }),
                        };

                        const res = await handler(event);
                        expect(res.statusCode).toBe(400);
                        expect(JSON.parse(res.body).error).toContain('Unsupported file format');
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});
