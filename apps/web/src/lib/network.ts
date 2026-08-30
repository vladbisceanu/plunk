import type {infer as ZodInfer, ZodSchema} from 'zod';

import {API_URI} from './constants';

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}

type JsonArray = (string | number | boolean | Date | Json | JsonArray)[];

interface TypedSchema extends ZodSchema {
  _type: unknown;
}

interface ApiResponse {
  message?: string;
  error?:
    | string
    | {
        message?: string;
        code?: string;
        [key: string]: unknown;
      };

  [key: string]: unknown;
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  let res: ApiResponse;
  try {
    res = (await response.json()) as ApiResponse;
  } catch (error) {
    if (response.ok) {
      throw error;
    }
    throw new Error('Something went wrong!');
  }

  if (response.status >= 400) {
    const structuredError = typeof res.error === 'object' ? res.error : undefined;

    if (structuredError?.code === 'EMAIL_VERIFICATION_REQUIRED') {
      if (typeof window !== 'undefined' && !window.location.href.includes('/auth/verify-email')) {
        window.location.href = '/auth/verify-email';
      }
      throw new Error(structuredError.message ?? 'Please verify your email address to continue');
    }

    const errorMessage =
      (typeof res.error === 'string' ? res.error : structuredError?.message) ??
      res.message ??
      'Something went wrong!';
    throw new Error(errorMessage);
  }

  return res as T;
}

export class network {
  public static async fetch<T, Schema extends TypedSchema | void = void>(
    method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: Schema extends TypedSchema ? ZodInfer<Schema> : never,
  ): Promise<T> {
    const url = path.startsWith('http') ? path : API_URI + path;

    // Get active project ID from localStorage
    const activeProjectId = typeof window !== 'undefined' ? localStorage.getItem('activeProjectId') : null;

    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (activeProjectId) {
      headers['X-Project-Id'] = activeProjectId;
    }

    const response = await fetch(url, {
      method,
      body: body && JSON.stringify(body),
      headers,
      credentials: 'include',
    });

    return readResponse<T>(response);
  }

  /**
   * Upload file using FormData (multipart/form-data)
   * Used for file uploads where Content-Type must be set by browser
   */
  public static async upload<T>(method: 'POST' | 'PUT' | 'PATCH', path: string, formData: FormData): Promise<T> {
    const url = path.startsWith('http') ? path : API_URI + path;

    // Get active project ID from localStorage
    const activeProjectId = typeof window !== 'undefined' ? localStorage.getItem('activeProjectId') : null;

    const headers: Record<string, string> = {};
    // DO NOT set Content-Type - browser will set it automatically with boundary
    if (activeProjectId) {
      headers['X-Project-Id'] = activeProjectId;
    }

    const response = await fetch(url, {
      method,
      body: formData,
      headers,
      credentials: 'include',
    });

    return readResponse<T>(response);
  }
}
