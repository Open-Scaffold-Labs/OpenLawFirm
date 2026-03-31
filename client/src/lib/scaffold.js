/**
 * @openscaffold/core — OpenLawFirm client initialization
 */

import { createApiClient } from '@openscaffold/core/client/api';
import { createAuthProvider } from '@openscaffold/core/client/useAuth';
import { createUseApi, createUseMutation } from '@openscaffold/core/client/useApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3024';
const TOKEN_KEY = 'olf_token';
const USER_KEY  = 'olf_user';

export const { api, getToken, setToken, clearToken, getUser, setUser, onAuthFailure } =
  createApiClient({ baseUrl: API_URL, tokenKey: TOKEN_KEY, userKey: USER_KEY });

export const { AuthProvider, useAuth } = createAuthProvider({
  api, getToken, setToken, clearToken, getUser, setUser, onAuthFailure
});

export const useApi = createUseApi({ api, getToken });
export const useMutation = createUseMutation({ api, getToken });

// Re-export commonly used UI components
export { default as SmartTextArea } from '@openscaffold/core/components/SmartTextArea';
export { default as DataTable } from '@openscaffold/core/components/DataTable';
export { default as Modal } from '@openscaffold/core/components/Modal';
export { default as LoadingSpinner } from '@openscaffold/core/components/LoadingSpinner';
export { default as EmptyState } from '@openscaffold/core/components/EmptyState';
export { default as ConfirmDialog } from '@openscaffold/core/components/ConfirmDialog';
export { default as AlertBanner } from '@openscaffold/core/components/ErrorAlert';
export { default as StatusBadge } from '@openscaffold/core/components/StatusBadge';
export { FormInput, FormSelect, FormTextArea, FormToggle, FormFieldGroup } from '@openscaffold/core/components/FormField';
export { default as ImportWizard } from '@openscaffold/core/components/ImportWizard';
export { default as VoiceInput } from '@openscaffold/core/components/VoiceInput';
