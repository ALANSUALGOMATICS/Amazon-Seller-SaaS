const env = import.meta.env;
export const config = Object.freeze({
  apiBaseUrl: env.VITE_API_BASE_URL || 'https://88fqh6z4la.execute-api.ap-south-1.amazonaws.com/prod',
  userPoolId: env.VITE_COGNITO_USER_POOL_ID || 'ap-south-1_2BHzdJOCJ',
  clientId: env.VITE_COGNITO_CLIENT_ID || '6druffm4vrngf5hvsu2l00o7sb',
  domain: env.VITE_COGNITO_DOMAIN || 'https://ap-south-12bhzdjocj.auth.ap-south-1.amazoncognito.com',
  redirectUri: env.VITE_COGNITO_REDIRECT_URI || 'https://www.indexspikerider.com',
  logoutUri: env.VITE_COGNITO_LOGOUT_URI || 'https://www.indexspikerider.com',
  scopes: env.VITE_COGNITO_SCOPES || 'openid email',
});
