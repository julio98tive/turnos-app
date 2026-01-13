import {initializeApp} from "firebase-admin/app";
import {onCall} from "firebase-functions/v2/https";

// Initialize Firebase Admin SDK
initializeApp();

// User management functions - TEMPORARILY COMMENTED OUT TO FIX DEPLOYMENT
// import { registerUser, resetPassword } from "./user_management";
// export { registerUser, resetPassword };

// Notification services
import {
  onShiftCreate,
  processPendingNotifications,
  sendShiftReminders,
} from "./notification-service";

export {
  onShiftCreate,
  processPendingNotifications,
  sendShiftReminders,
};

// Health check endpoint
export const healthCheck = onCall((request) => {
  return {status: "ok", message: `Hello ${request.auth?.token.name || "world"} from the cloud!`};
});
