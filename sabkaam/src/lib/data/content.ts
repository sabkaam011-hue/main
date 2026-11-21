import "server-only";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n/dictionaries";

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

const FALLBACK_FAQS = {
  en: [
    { id: "1", question: "Is Sabkaam a government website?", answer: "No. Sabkaam is a private assistance platform and is not affiliated with any government department. We link to official portals for every service." },
    { id: "2", question: "Is browsing free?", answer: "Yes. Searching and reading about any scheme or service is completely free. You only pay if you choose paid application assistance." },
    { id: "3", question: "Do you guarantee approval?", answer: "No. Approval is always decided by the government department, bank or authority. We help you apply correctly and completely." },
    { id: "4", question: "Are government fees included in your fee?", answer: "No. Our fee is only for our assistance. Any official fee is paid by you directly on the official portal." },
    { id: "5", question: "How are my documents protected?", answer: "Documents are stored in private, access-controlled storage and are only visible to you and the staff handling your request." },
  ],
  hi: [
    { id: "1", question: "क्या सबकाम सरकारी वेबसाइट है?", answer: "नहीं। सबकाम एक निजी सहायता प्लेटफ़ॉर्म है और किसी सरकारी विभाग से संबद्ध नहीं है। हम हर सेवा के लिए आधिकारिक पोर्टल का लिंक देते हैं।" },
    { id: "2", question: "क्या जानकारी देखना मुफ़्त है?", answer: "हाँ। किसी भी योजना या सेवा को खोजना और पढ़ना पूरी तरह मुफ़्त है। आप केवल तभी भुगतान करते हैं जब आप सशुल्क सहायता चुनते हैं।" },
    { id: "3", question: "क्या आप स्वीकृति की गारंटी देते हैं?", answer: "नहीं। स्वीकृति हमेशा सरकारी विभाग, बैंक या संस्था तय करती है। हम सही और पूरा आवेदन करने में मदद करते हैं।" },
    { id: "4", question: "क्या सरकारी शुल्क आपके शुल्क में शामिल है?", answer: "नहीं। हमारा शुल्क केवल हमारी सहायता के लिए है। कोई भी सरकारी शुल्क आप सीधे आधिकारिक पोर्टल पर देते हैं।" },
    { id: "5", question: "मेरे दस्तावेज़ कैसे सुरक्षित हैं?", answer: "दस्तावेज़ निजी, नियंत्रित स्टोरेज में रखे जाते हैं और केवल आपको और आपके अनुरोध पर काम करने वाले स्टाफ़ को दिखते हैं।" },
  ],
};

export async function getFaqs(locale: Locale): Promise<Faq[]> {
  if (isServiceRoleConfigured()) {
    const { data, error } = await createAdminClient()
      .from("faqs")
      .select("id, question, answer, question_hi, answer_hi")
      .eq("is_published", true)
      .order("sort_order");
    if (!error && data?.length) {
      return data.map((f) => ({
        id: f.id,
        question: locale === "hi" && f.question_hi ? f.question_hi : f.question,
        answer: locale === "hi" && f.answer_hi ? f.answer_hi : f.answer,
      }));
    }
  }
  return FALLBACK_FAQS[locale];
}

export async function getSiteContent(key: string, locale: Locale): Promise<string> {
  if (!isServiceRoleConfigured()) return "";
  const { data } = await createAdminClient().from("site_content").select("value_en, value_hi").eq("key", key).maybeSingle();
  if (!data) return "";
  return (locale === "hi" && data.value_hi) || data.value_en || "";
}
