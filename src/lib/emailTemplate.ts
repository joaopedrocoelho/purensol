interface Product {
  name: string;
  price: number;
}

interface EmailData {
  fullName: string;
  email: string;
  products: Product[];
  gifts: Product[];
  total: number;
  timestamp: string;
}

/**
 * Generate HTML email template for order confirmation
 * Matches the Success screen design
 */
export function generateOrderConfirmationEmail(data: EmailData): string {
  const { fullName, products, gifts, total } = data;

  const productsList =
    products.length > 0
      ? products
          .map(
            (product) => `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 16px;">
        <div style="flex: 1; min-width: 0;">
          <p style="margin: 0; color: #111827; font-weight: 500; word-wrap: break-word;">${
            product.name
          }</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">$${product.price.toLocaleString()}</p>
        </div>
      </div>
    `
          )
          .join("")
      : `
      <div style="text-center; padding: 16px; color: #6b7280;">
        <p style="margin: 0;">您尚未選擇任何商品</p>
      </div>
    `;

  const giftsList =
    gifts.length > 0
      ? gifts
          .map(
            (gift) => `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 16px; background-color: #ffffff;">
        <div style="flex: 1; min-width: 0;">
          <p style="margin: 0; color: #111827; font-weight: 500; word-wrap: break-word;">${gift.name}</p>
          <p style="margin: 4px 0 0; color: #059669; font-size: 14px; font-weight: 600;">免費</p>
        </div>
      </div>
    `
          )
          .join("")
      : `
      <div style="text-center; padding: 16px; color: #6b7280;">
        <p style="margin: 0;">無</p>
      </div>
    `;

  const totalSection =
    products.length > 0
      ? `
      <div style="padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 18px; font-weight: 600; color: #111827;">總計</span>
          <span style="font-size: 24px; font-weight: bold; color: #111827;">$${total.toLocaleString()}</span>
        </div>
      </div>
    `
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 672px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Success Message -->
          <tr>
            <td style="padding: 24px;">
              <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #166534;">表單提交成功囉！</h2>
                <p style="margin: 0; color: #15803d; font-size: 14px;"> 請私訊官方Line(@purensoltw)，小幫手會盡快協助確認訂單內容♥︎</p>
              </div>
              
              <!-- Friendly pre-order message -->
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                嗨${fullName ? ` ${fullName}` : ""}！ 👋<br><br>
                這是您預購的內容，請協助確認～有任何問題請勿回覆此email，可以直接訊息官方Line：@purensoltw，謝謝您
              </p>
              
              <!-- Products Section -->
              ${
                products.length > 0
                  ? `
              <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">已選擇的商品</h3>
                <div style="margin-bottom: 16px;">
                  ${productsList}
                </div>
                ${totalSection}
              </div>
              `
                  : ""
              }
              
              <!-- Gifts Section -->
              ${
                gifts.length > 0
                  ? `
              <div style="background-color: #fffbeb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border: 1px solid #fbbf24; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">已選擇的贈品</h3>
                <div>
                  ${giftsList}
                </div>
              </div>
              `
                  : ""
              }
              
              <!-- Footer Message -->
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                我們會盡快處理您的訂單，如有任何問題，請隨時與我們聯繫。<br><br>
                再次感謝您的支持！ ❤️
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML email template for admin notification
 * Contains user info and order details
 */
export function generateAdminNotificationEmail(data: EmailData): string {
  const { fullName, email, products, gifts, total, timestamp } = data;

  const productsList =
    products.length > 0
      ? products
          .map(
            (product) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${
          product.name
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${product.price.toLocaleString()}</td>
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; text-align: center;">無</td>
      </tr>
    `;

  const giftsList =
    gifts.length > 0
      ? gifts
          .map(
            (gift) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${gift.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 600;">免費</td>
      </tr>
    `
          )
          .join("")
      : `
      <tr>
        <td colspan="2" style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; text-align: center;">無</td>
      </tr>
    `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 672px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px; background-color: #3b82f6; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #ffffff;">新訂單通知</h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                您收到一個新的訂單提交：
              </p>
              
              <!-- User Info -->
              <div style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">客戶資訊</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">姓名：</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${
                      fullName || "未提供"
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">電子郵件：</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${
                      email || "未提供"
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">提交時間：</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${timestamp}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Products -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">已選擇的商品</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">商品名稱</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">價格</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productsList}
                  </tbody>
                </table>
              </div>
              
              <!-- Gifts -->
              ${
                gifts.length > 0
                  ? `
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">已選擇的贈品</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #fbbf24; border-radius: 6px; overflow: hidden; background-color: #fffbeb;">
                  <thead>
                    <tr style="background-color: #fef3c7;">
                      <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fbbf24; color: #374151; font-weight: 600;">贈品名稱</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 1px solid #fbbf24; color: #374151; font-weight: 600;">價格</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${giftsList}
                  </tbody>
                </table>
              </div>
              `
                  : ""
              }
              
              <!-- Total -->
              <div style="padding: 20px; background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 18px; font-weight: 600; color: #111827;">總計</span>
                  <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">$${total.toLocaleString()}</span>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
