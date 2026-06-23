// Runtime config for client. Values inlined at build time by Vite.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const config = {
  apiBase: API_BASE,
  // Toggle features here.
  features: {
    showGroundingPanel: true,
    enableMapsWidgetLink: true,
  },
};
