import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/** Express identifies error-handling middleware by its 4-arg signature —
 * the unused `_next` param is required, not dead code. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request', details: err.flatten() });
        return;
    }

    console.error('[Server Error]', err);
    res.status(500).json({ error: 'Internal server error' });
}

/** Wraps an async route handler so a rejected promise reaches errorHandler
 * instead of crashing the process — Express doesn't do this automatically
 * for async handlers. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<void>>(
    fn: T
) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}
