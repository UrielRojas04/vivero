export const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || fallback;