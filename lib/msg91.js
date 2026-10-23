// Widget se jo token aata hai, server pe MSG91 se verify karo
// taaki koi bina OTP ke fake entry na daal sake
export async function verifyMsg91Token(accessToken) {
  const res = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authkey: process.env.MSG91_AUTHKEY,
      "access-token": accessToken,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data?.type === "success" ? data : null;
}