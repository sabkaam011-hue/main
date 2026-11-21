const WHATSAPP_NUMBER = "91720992081";

export function openWhatsApp(
  message = "Hello Sabkaam, mujhe assistance chahiye."
) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function whatsappLink(
  message = "Hello Sabkaam, mujhe assistance chahiye."
) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}