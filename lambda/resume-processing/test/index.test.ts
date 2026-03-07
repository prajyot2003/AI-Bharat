/**
 * Unit Tests for Resume Processing Lambda Handler
 *
 * Requirements: 7.3, 7.6, 7.10, 4.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Mock = mockClient(S3Client);
const bedrockMock = mockClient(BedrockRuntimeClient);
const dynamoMock = mockClient(DynamoDBDocumentClient);

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/navixa-resume-documents/signed-url?X-Amz-Expires=3600'),
}));

const { handler, buildS3Key, isValidFileFormat, getFileExtension } = await import('../index.js');

describe('Resume Processing Lambda Handler', () => {
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

    describe('Request Validation', () => {
        it('should return 400 when action is missing', async () => {
            const res = await handler({ body: JSON.stringify({ userId: 'user-1' }) });
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 when userId is missing', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'generate-upload-url' }) });
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 for unknown action', async () => {
            const res = await handler({ body: JSON.stringify({ action: 'delete', userId: 'u1' }) });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Pre-signed URL Generation', () => {
        it('should generate pre-signed URL with 1-hour expiration', async () => {
            const event = {
                body: JSON.stringify({
                    action: 'generate-upload-url',
                    userId: 'user-123',
                    fileName: 'my-resume.pdf',
                    contentType: 'application/pdf',
                }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            expect(body.uploadUrl).toBeDefined();
            expect(body.uploadUrl).toContain('X-Amz-Expires=3600');
            expect(body.expiresIn).toBe(3600); // 1 hour
        });

        it('should store resume with userId prefix in S3 path', async () => {
            const event = {
                body: JSON.stringify({
                    action: 'generate-upload-url',
                    userId: 'user-456',
                    fileName: 'resume.docx',
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                }),
            };

            const res = await handler(event);
            const body = JSON.parse(res.body);

            expect(res.statusCode).toBe(200);
            // Property: key must start with userId
            expect(body.s3Key).toMatch(/^user-456\//);
        });

        it('should reject unsupported file formats', async () => {
            const event = {
                body: JSON.stringify({
                    action: 'generate-upload-url',
                    userId: 'user-789',
                    fileName: 'resume.exe',
                    contentType: 'application/octet-stream',
                }),
            };

            const res = await handler(event);
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).error).toContain('Unsupported file format');
        });

        it('should return 400 if fileName missing for upload-url action', async () => {
            const res = await handler({
                body: JSON.stringify({ action: 'generate-upload-url', userId: 'u1' }),
            });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('File Format Validation', () => {
        it('should accept PDF files', () => {
            expect(isValidFileFormat('application/pdf', '.pdf')).toBe(true);
        });

        it('should accept DOCX files', () => {
            expect(
                isValidFileFormat(
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.docx'
                )
            ).toBe(true);
        });

        it('should accept TXT files', () => {
            expect(isValidFileFormat('text/plain', '.txt')).toBe(true);
        });

        it('should reject EXE files', () => {
            expect(isValidFileFormat('application/octet-stream', '.exe')).toBe(false);
        });

        it('should reject ZIP files', () => {
            expect(isValidFileFormat('application/zip', '.zip')).toBe(false);
        });
    });

    describe('S3 Key Construction', () => {
        it('should include userId as prefix', () => {
            const key = buildS3Key('user-abc', 'resume.pdf');
            expect(key).toMatch(/^user-abc\/resumes\//);
            expect(key).toContain('resume.pdf');
        });

        it('should sanitize special characters in filename', () => {
            const key = buildS3Key('user-1', 'my résumé (final).pdf');
            expect(key).not.toContain(' ');
            expect(key).not.toContain('é');
            expect(key).not.toContain('(');
        });
    });

    describe('File Extension Detection', () => {
        it('should detect .pdf extension', () => {
            expect(getFileExtension('resume.pdf')).toBe('.pdf');
        });

        it('should detect .docx extension', () => {
            expect(getFileExtension('resume.docx')).toBe('.docx');
        });

        it('should be case insensitive', () => {
            expect(getFileExtension('RESUME.PDF')).toBe('.pdf');
        });

        it('should return empty string for no extension', () => {
            expect(getFileExtension('resumenoextension')).toBe('');
        });
    });

    describe('CORS Headers', () => {
        it('should include CORS headers in all responses', async () => {
            const res = await handler({ body: JSON.stringify({ userId: 'u1' }) });
            expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
        });
    });
});
