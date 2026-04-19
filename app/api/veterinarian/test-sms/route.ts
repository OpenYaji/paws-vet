import { NextResponse } from "next/server";
// change this path to match your actual file location
import { sendSms, sendSmsToClient, sendSmsByName } from "@/utils/httpSms";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, message, clientProfileId, clientName } = body;

        let success = false;

        // test sending to a specific number
        if (to && message) {
            success = await sendSms(to, message);
        }
        // test sending using a database id
        else if (clientProfileId && message) {
            success = await sendSmsToClient(clientProfileId, message);
        }
        // test sending using a client name
        else if (clientName && message) {
            success = await sendSmsByName(clientName, message);
        }

        else {
            return NextResponse.json({ error: "missing required fields in body" }, { status: 400 });
        }

        if (success) {
            return NextResponse.json({ success: true, message: "sms sent successfully" });
        } else {
            return NextResponse.json({ error: "failed to send sms. check your console logs." }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}