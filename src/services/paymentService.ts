import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../server.js';

// Soo qaado Credentials-ka xogta deegaanka (.env)
const ZAAD_API_URL = process.env.ZAAD_API_URL || 'https://api.waafi.com/asm'; // Ama Telesom Sandbox Endpoint
const ZAAD_MERCHANT_ID = process.env.ZAAD_MERCHANT_ID || '';
const ZAAD_API_KEY = process.env.ZAAD_API_KEY || '';
const ZAAD_USER_ID = process.env.ZAAD_USER_ID || '';

const EDAHAB_API_URL = process.env.EDAHAB_API_URL || 'https://edahab.somtelnetwork.com/api'; 
const EDAHAB_API_KEY = process.env.EDAHAB_API_KEY || '';
const EDAHAB_CLIENT_ID = process.env.EDAHAB_CLIENT_ID || '';
const EDAHAB_SECRET_KEY = process.env.EDAHAB_SECRET_KEY || '';

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export class PaymentService {

  /**
   * 1. TELESOM ZAAD INTEGRATION (WAAFI API MERCHANT PORTAL)
   * Telesom waxay adeegsataa nidaamka API_PURCHASE ee loo yaqaan Waafi API.
   */
  static async initiateZaadPayment(
    orderId: string,
    amount: number,
    payerPhone: string
  ): Promise<PaymentResponse> {
    try {
      // 1. Hubi in nambarka telefoonku u qaabaysan yahay si sax ah (e.g. 25263xxxxxxx ama 63xxxxxxx)
      const formattedPhone = this.formatSomalilandNumber(payerPhone);

      // 2. Diyaari Payload-ka rasmiga ah ee Telesom Waafi API
      const payload = {
        schemaVersion: "1.1",
        requestId: orderId,
        timestamp: new Date().toISOString(),
        channelName: "WEB",
        serviceName: "API_PURCHASE",
        serviceParams: {
          merchantUID: ZAAD_MERCHANT_ID,
          merchantApiKey: ZAAD_API_KEY,
          merchantUsername: ZAAD_USER_ID,
          payerInfo: {
            paymentInstrument: formattedPhone
          },
          transactionInfo: {
            amount: amount.toString(),
            currency: "USD", // Zaad wuxuu inta badan ku furaa USD
            description: `Raysin Order Payment #${orderId.substring(0, 8)}`,
            referenceId: orderId
          }
        }
      };

      // 3. U dir codsiga Server-ka Telesom
      const response = await axios.post(ZAAD_API_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const responseData = response.data;

      // 4. Hubi jawaabta (Response Verification)
      // Telesom waxay soo celisaa 'responseCode' iyadoo '2001' ay tahay guul (SUCCESS)
      if (responseData && responseData.responseCode === "2001") {
        const transactionId = responseData.params?.transactionId || `TXN-ZAAD-${Date.now()}`;
        return {
          success: true,
          transactionId,
          rawResponse: responseData
        };
      } else {
        return {
          success: false,
          errorMessage: responseData.responseMessage || "Lacag bixinta Zaad waa la diiday.",
          rawResponse: responseData
        };
      }

    } catch (error: any) {
      console.error("Zaad Payment API Error:", error.response?.data || error.message);
      return {
        success: false,
        errorMessage: `Cilad ku timaada isku xirka Telesom: ${error.message}`
      };
    }
  }

  /**
   * 2. SOMTEL E-DAHAB INTEGRATION
   * E-Dahab wuxuu rabaa Signature xisaabsan (SHA256 Hash) oo la generates-gareeyo ka hor intaan request-ka la dirin.
   */
  static async initiateEDahabPayment(
    orderId: string,
    amount: number,
    payerPhone: string
  ): Promise<PaymentResponse> {
    try {
      const formattedPhone = this.formatSomalilandNumber(payerPhone);

      // 1. Diyaari Payload-ka
      const requestData = {
        apiKey: EDAHAB_API_KEY,
        clientId: EDAHAB_CLIENT_ID,
        customerMSISDN: formattedPhone,
        amount: amount,
        currency: "USD",
        merchantOrderId: orderId,
        description: `Raysin Order Payment #${orderId.substring(0, 8)}`
      };

      // 2. E-Dahab Security Signature Generation (HMAC SHA256)
      // Waxaa la isku xiraa xogta API-ga iyadoo la adeegsanayo Secret Key-ga
      const dataString = JSON.stringify(requestData);
      const signature = crypto
        .createHmac('sha256', EDAHAB_SECRET_KEY)
        .update(dataString)
        .digest('hex');

      // 3. U dir codsiga rasmiga ah E-Dahab API endpoint
      const response = await axios.post(`${EDAHAB_API_URL}/payment`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature // Signature-ka waxaa lagu diraa Header-ka
        }
      });

      const responseData = response.data;

      // 4. Hubi haddii lacag bixintu guulaysatay (Status === 'OK' ama '0')
      if (responseData && responseData.StatusCode === "0") {
        return {
          success: true,
          transactionId: responseData.TransactionId,
          rawResponse: responseData
        };
      } else {
        return {
          success: false,
          errorMessage: responseData.StatusMessage || "Lacag bixinta E-Dahab waa la diiday.",
          rawResponse: responseData
        };
      }

    } catch (error: any) {
      console.error("E-Dahab Payment API Error:", error.response?.data || error.message);
      return {
        success: false,
        errorMessage: `Cilad ku timaada isku xirka Somtel: ${error.message}`
      };
    }
  }

  /**
   * 3. CAWINAAD: Habeeyaha Nambarka Telefoonka (Somaliland Numbers format)
   * Telesom iyo Somtel waxay u baahan yihiin inuu nambarku ku bilaawdo 25263 ama 63
   */
  private static formatSomalilandNumber(phone: string): string {
    // Ka saar wixii space, dashes ama xarfo ah
    let clean = phone.replace(/\D/g, '');

    // Haddii uu ku bilaawdo + ama 00, ka jar
    if (clean.startsWith('00252')) clean = clean.substring(2);
    if (clean.startsWith('252')) return clean; // Waa sax (Format: 25263xxxxxxx)

    if (clean.startsWith('063')) clean = '63' + clean.substring(3);
    if (clean.startsWith('63')) return '252' + clean; // Bedel (63xxxxxxx -> 25263xxxxxxx)

    return clean;
  }
}