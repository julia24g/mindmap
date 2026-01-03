import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthContext {
  userId?: string;
  email?: string;
  isAuthenticated: boolean;
}

export const verifyToken = (token: string): { userId: string; email: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    throw new GraphQLError('Invalid or expired token');
  }
}

export const getAuthContext = (headers: Record<string, string | string[]>): AuthContext => {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return { isAuthenticated: false };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const decoded = verifyToken(token);
    return {
      userId: decoded.userId,
      email: decoded.email,
      isAuthenticated: true
    };
  } catch (error) {
    return { isAuthenticated: false };
  }
}

export const requireAuth = (context: AuthContext): void => {
  if (!context.isAuthenticated) {
    throw new GraphQLError('Authentication required');
  }
} 