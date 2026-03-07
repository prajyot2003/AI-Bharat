/**
 * Shared Security Utilities for Lambda Functions
 *
 * Provides input sanitization and secure logging utilities.
 * Requirements: 12.4, 12.5, 12.7
 */

// Patterns that indicate potential prompt injection or XSS
const DANGEROUS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<[^>]*on\w+\s*=/gi,
    /javascript:/gi,
    /\bSYSTEM\s*PROMPT\b/gi,
    /\bIGNORE\s+ALL\s+PREVIOUS\s+INSTRUCTIONS\b/gi,
    /\bACT\s+AS\s+IF\s+YOU\s+ARE\b/gi,
    /\bYOU\s+ARE\s+NOW\s+IN\s+DEVELOPER\s+MODE\b/gi,
    /\bDAN\s+MODE\b/gi,
    /\bJAILBREAK\b/gi,
];

// Sensitive data patterns to redact from logs
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /("password"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("apiKey"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("api_key"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("x-api-key"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("token"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("secret"\s*:\s*)"[^"]*"/gi, replacement: '$1"[REDACTED]"' },
    { pattern: /("email"\s*:\s*)"[^"@"]*@[^"]*"/gi, replacement: '$1"[EMAIL_REDACTED]"' },
    { pattern: /\b[A-Z0-9]{20,}(?:[A-Z0-9+/]{0,2}=?)\b/g, replacement: '[ACCESS_KEY_REDACTED]' },
    { pattern: /\b(sk-|pk-)[a-zA-Z0-9]{20,}\b/g, replacement: '[API_KEY_REDACTED]' },
];

/**
 * Sanitize user input to remove:
 * - HTML/script tags
 * - Prompt injection attempts
 *
 * Requirements: 12.4, 12.5
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    let sanitized = input;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
    }

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 10000);

    return sanitized;
}

/**
 * Check if input contains prompt injection attempt
 */
export function isPromptInjection(input: string): boolean {
    return DANGEROUS_PATTERNS.some(pattern => {
        pattern.lastIndex = 0; // Reset regex state
        return pattern.test(input);
    });
}

/**
 * Create a secure logger that redacts sensitive data
 *
 * Requirements: 12.7
 */
export function createSecureLogger(context: string) {
    function redact(data: any): string {
        let str = typeof data === 'object' ? JSON.stringify(data) : String(data);
        for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
            str = str.replace(pattern, replacement);
        }
        return str;
    }

    return {
        log: (message: string, data?: any) => {
            const logEntry = {
                level: 'INFO',
                context,
                message,
                data: data !== undefined ? JSON.parse(redact(data)) : undefined,
                timestamp: new Date().toISOString(),
            };
            console.log(JSON.stringify(logEntry));
        },
        error: (message: string, error?: any) => {
            const logEntry = {
                level: 'ERROR',
                context,
                message,
                errorType: error?.name,
                errorMessage: error?.message,
                timestamp: new Date().toISOString(),
            };
            console.error(JSON.stringify(logEntry));
        },
        warn: (message: string, data?: any) => {
            const logEntry = {
                level: 'WARN',
                context,
                message,
                data: data !== undefined ? redact(data) : undefined,
                timestamp: new Date().toISOString(),
            };
            console.warn(JSON.stringify(logEntry));
        },
    };
}

/**
 * Model complexity calculation for cost optimization
 *
 * Requirements: 13.1, 13.2
 */
export function calculateComplexity(query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Complexity indicators
    const complexIndicators = [
        'explain', 'analyze', 'design', 'architecture', 'compare', 'evaluate',
        'strategy', 'comprehensive', 'detailed', 'step-by-step', 'roadmap',
        'learning path', 'career plan', 'skill gap', 'system design',
    ];

    const simpleIndicators = [
        'what is', 'define', 'list', 'name', 'when', 'where', 'how many',
        'quick', 'brief', 'short', 'simple',
    ];

    // Check length (longer queries tend to be more complex)
    if (query.length > 200) score += 0.2;
    if (query.length > 500) score += 0.1;

    // Check for complex indicators
    const complexMatches = complexIndicators.filter(i => lowerQuery.includes(i)).length;
    score += Math.min(complexMatches * 0.15, 0.45);

    // Subtract for simple indicators
    const simpleMatches = simpleIndicators.filter(i => lowerQuery.includes(i)).length;
    score -= Math.min(simpleMatches * 0.1, 0.3);

    // Normalize to 0–1
    return Math.max(0, Math.min(1, 0.3 + score));
}

/**
 * Select appropriate Bedrock model based on query complexity
 *
 * Requirements: 13.1, 13.2
 */
export function selectModel(query: string, forceComplex = false): string {
    if (forceComplex) {
        return 'anthropic.claude-3-sonnet-20240229-v1:0';
    }

    const complexity = calculateComplexity(query);

    if (complexity >= 0.7) {
        return 'anthropic.claude-3-sonnet-20240229-v1:0';
    }
    return 'anthropic.claude-3-haiku-20240307-v1:0';
}

/**
 * Select model for known request types
 */
export function selectModelForRequest(requestType: 'chat' | 'learning-path' | 'rag' | 'resume' | 'job', query = ''): string {
    // Learning path always uses Sonnet for quality
    if (requestType === 'learning-path') {
        return 'anthropic.claude-3-sonnet-20240229-v1:0';
    }
    // RAG and chat use complexity-based selection
    return selectModel(query);
}
