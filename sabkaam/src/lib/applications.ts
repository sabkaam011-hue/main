export const APPLICATION_STATUSES = [
  "submitted",
  "payment_pending",
  "payment_successful",
  "under_review",
  "documents_required",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

type Tone = "teal" | "navy" | "accent" | "muted" | "success" | "danger" | "warn";

export const STATUS_META: Record<ApplicationStatus, { en: string; hi: string; tone: Tone; next: string; nextHi: string }> = {
  submitted: { en: "Submitted", hi: "जमा किया गया", tone: "navy", next: "We have received your request.", nextHi: "हमें आपका अनुरोध मिल गया है।" },
  payment_pending: { en: "Payment Pending", hi: "भुगतान बाकी", tone: "warn", next: "Complete the assistance fee payment to start processing.", nextHi: "प्रक्रिया शुरू करने के लिए सहायता शुल्क का भुगतान करें।" },
  payment_successful: { en: "Payment Successful", hi: "भुगतान सफल", tone: "success", next: "Upload the requested documents. Our team will review your request shortly.", nextHi: "माँगे गए दस्तावेज़ अपलोड करें। हमारी टीम जल्द समीक्षा करेगी।" },
  under_review: { en: "Under Review", hi: "समीक्षा में", tone: "teal", next: "Our team is reviewing your details and documents.", nextHi: "हमारी टीम आपके विवरण और दस्तावेज़ों की समीक्षा कर रही है।" },
  documents_required: { en: "Documents Required", hi: "दस्तावेज़ आवश्यक", tone: "accent", next: "Please upload the additional documents mentioned in the latest update.", nextHi: "कृपया नवीनतम अपडेट में बताए गए अतिरिक्त दस्तावेज़ अपलोड करें।" },
  in_progress: { en: "In Progress", hi: "प्रगति पर", tone: "teal", next: "We are working on your application. We'll update you here.", nextHi: "हम आपके आवेदन पर काम कर रहे हैं। अपडेट यहाँ मिलेगा।" },
  completed: { en: "Completed", hi: "पूर्ण", tone: "success", next: "Assistance is complete. Track the official status on the official portal using your acknowledgement number.", nextHi: "सहायता पूरी हुई। आधिकारिक पोर्टल पर अपनी पावती संख्या से स्थिति देखें।" },
  rejected: { en: "Rejected / Unable to Proceed", hi: "अस्वीकृत / आगे नहीं बढ़ सकते", tone: "danger", next: "We were unable to proceed. See the note from our team; refunds follow our Refund Policy.", nextHi: "हम आगे नहीं बढ़ सके। टीम का नोट देखें; रिफंड हमारी नीति के अनुसार।" },
  cancelled: { en: "Cancelled", hi: "रद्द", tone: "muted", next: "This request was cancelled.", nextHi: "यह अनुरोध रद्द कर दिया गया।" },
};

/** Statuses only the payment system may set (never staff via the UI). */
export const SYSTEM_ONLY_STATUSES: ApplicationStatus[] = ["payment_pending", "payment_successful"];
export const STAFF_SETTABLE_STATUSES = APPLICATION_STATUSES.filter((s) => !SYSTEM_ONLY_STATUSES.includes(s) && s !== "submitted");
export const UPLOAD_ALLOWED_STATUSES: ApplicationStatus[] = ["payment_successful", "under_review", "documents_required", "in_progress"];
export const USER_CANCELLABLE_STATUSES: ApplicationStatus[] = ["submitted", "payment_pending"];
export const TERMINAL_STATUSES: ApplicationStatus[] = ["completed", "rejected", "cancelled"];

export function statusLabel(s: ApplicationStatus, locale: string) {
  return locale === "hi" ? STATUS_META[s].hi : STATUS_META[s].en;
}

export const PAYMENT_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  created: { label: "Created", tone: "muted" },
  pending: { label: "Pending", tone: "warn" },
  success: { label: "Successful", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refund_pending: { label: "Refund pending", tone: "accent" },
  refunded: { label: "Refunded", tone: "navy" },
  partially_refunded: { label: "Partially refunded", tone: "navy" },
};
