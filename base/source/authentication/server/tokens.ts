import { injectionToken } from '#/container';
import type { AuthenticationServiceOptions } from './authentication.service';

export const AUTHENTICATION_SERVICE_OPTIONS = injectionToken<AuthenticationServiceOptions>('AUTHENTICATION_SERVICE_OPTIONS');
