import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export async function sendSms(phoneNumber: string, message: string) {
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("No Valid Credentials");
  }

  const snsClient = new SNSClient({
    region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  try {
    // format the phone number to E.164 format
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+63" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+" + formattedPhone;
    }

    // set the parameters for the SNS client
    const params = {
      Message: message,
      PhoneNumber: formattedPhone,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          // 'Transactional' bypasses promotional quiet hours and sends immediately
          StringValue: "Transactional",
        },
      },
    };

    const response = await snsClient.send(new PublishCommand(params));
    console.log("aws sns success:", response);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}
