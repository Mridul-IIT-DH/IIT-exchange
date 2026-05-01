import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // In development, handle missing key gracefully
      console.warn("RESEND_API_KEY is missing. Email features will not work.");
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendListingVerificationEmail(
  to: string, 
  product: {
    title: string;
    price: number;
    imageUrl: string | null;
    createdAt: any;
    url: string;
  }, 
  links: {
    sold: string;
    relist: string;
  }
) {
  const resend = getResend();
  if (!resend) return { error: "Resend not initialized" };

  const listingDate = product.createdAt 
    ? (typeof product.createdAt.toDate === 'function' ? product.createdAt.toDate() : new Date(product.createdAt))
    : new Date();

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'IIT Exchange <onboarding@resend.dev>';

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Action Required: Is your "${product.title}" sold?`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #000; font-style: italic; font-weight: 900; letter-spacing: -2px; font-size: 32px; margin: 0;">IIT EXCHANGE</h1>
            <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; font-weight: bold; color: #666; margin-top: 5px;">Campus Marketplace Sentinel</p>
          </div>

          <div style="background-color: #fcfcfc; border-radius: 24px; padding: 30px; margin-bottom: 40px; border: 1px solid #eeeeee; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
            <p style="font-size: 16px; margin-top: 0; color: #444;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.5; color: #444;">Your listing is approaching its expiration date. To keep the community active, we need you to confirm its status.</p>
            
            <div style="background-color: #ffffff; border-radius: 20px; padding: 20px; margin: 25px 0; border: 1px solid #f0f0f0;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  ${product.imageUrl ? `
                  <td width="100" valign="middle">
                    <div style="width: 80px; height: 80px; border-radius: 14px; overflow: hidden; background-color: #f5f5f5;">
                      <img src="${product.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${product.title}" />
                    </div>
                  </td>
                  ` : ''}
                  <td valign="middle" style="padding-left: 10px;">
                    <h3 style="margin: 0; font-size: 18px; color: #000; font-weight: 800;">${product.title}</h3>
                    <p style="margin: 5px 0; color: #4285F4; font-weight: bold; font-size: 16px;">₹${product.price ? product.price.toLocaleString() : 'N/A'}</p>
                    <p style="margin: 0; font-size: 12px; color: #888; font-weight: 500;">Listed on: ${listingDate.toLocaleDateString()}</p>
                    <div style="margin-top: 10px;">
                      <a href="${product.url}" style="color: #4285F4; font-size: 12px; font-weight: 700; text-decoration: none; border-bottom: 1px solid #4285F4;">View Listing Details &rarr;</a>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fff5f5; border-radius: 12px; padding: 12px 16px; border: 1px solid #ffebeb;">
              <p style="font-size: 13px; font-weight: 700; color: #ea4335; margin: 0; line-height: 1.4;">
                Note: If no action is taken, this listing will be automatically marked as 'Expired' and hidden from the market.
              </p>
            </div>
          </div>

          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
            <tr>
              <td width="48%" style="padding-bottom: 20px;">
                <a href="${links.sold}" style="display: block; background-color: #000000; color: #ffffff; padding: 20px 10px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; text-align: center; border: 2px solid #000000;">
                  Yes, It's Sold
                </a>
              </td>
              <td width="4%"></td>
              <td width="48%" style="padding-bottom: 20px;">
                <a href="${links.relist}" style="display: block; background-color: #ffffff; color: #000000; padding: 20px 10px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; text-align: center; border: 2px solid #000000;">
                  No, Relist It
                </a>
              </td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eeeeee; text-align: center;">
            <p style="font-size: 12px; color: #999; margin: 0;">IIT Dharwad Marketplace &bull; Student Trading Network</p>
            <p style="font-size: 10px; color: #ccc; margin-top: 10px;">You are receiving this automated security notification because of your active listing.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend send error:", error);
      return { error };
    }

    return { data };
  } catch (err) {
    console.error("Unexpected email error:", err);
    return { error: err };
  }
}

// Deprecated - maintain for compatibility if needed during migration
export async function sendSoldConfirmationEmail(
  to: string, 
  productTitle: string, 
  magicLink: string
) {
  return sendListingVerificationEmail(
    to, 
    { title: productTitle, price: 0, imageUrl: null, createdAt: null, url: '#' },
    { sold: magicLink, relist: magicLink }
  );
}
