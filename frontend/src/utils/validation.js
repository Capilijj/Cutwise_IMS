export const CUSTOMER_NAME_REGEX = /^[a-zA-Z\s\-'.]+$/;

export function validateCustomerName(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "Customer name is required.";
  }
  if (trimmed.length > 150) {
    return "Customer name must not exceed 150 characters.";
  }
  if (/\d/.test(trimmed)) {
    return "Customer name cannot contain numbers.";
  }
  if (!CUSTOMER_NAME_REGEX.test(trimmed)) {
    return "Customer name can only contain letters, spaces, hyphens, apostrophes, and periods.";
  }
  return "";
}
