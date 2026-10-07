// backend/src/types/custom-express.d.ts
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
    user: DecodedIdToken;
}