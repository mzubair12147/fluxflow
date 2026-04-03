import nodemailer, { type Transporter } from 'nodemailer';

export type AuthEmailMessage = {
    to: string;
    subject: string;
    text: string;
    html: string;
};

export interface AuthEmailSender {
    send(message: AuthEmailMessage): Promise<void>;
}

export const AUTH_EMAIL_SENDER = 'AUTH_EMAIL_SENDER';

export class ConsoleAuthEmailSender implements AuthEmailSender {
    async send(message: AuthEmailMessage): Promise<void> {
        console.info(
            `[AuthEmail] to=${message.to} subject=${message.subject}\n${message.text}`,
        );
    }
}

export class NodemailerAuthEmailSender implements AuthEmailSender {
    constructor(
        private readonly transporter: Transporter,
        private readonly from: string,
    ) {}

    async send(message: AuthEmailMessage): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
        });
    }
}

export function createSmtpAuthEmailSender(config: {
    host: string;
    port: number;
    secure: boolean;
    from: string;
    user?: string;
    pass?: string;
}): AuthEmailSender {
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
            config.user && config.pass
                ? {
                      user: config.user,
                      pass: config.pass,
                  }
                : undefined,
    });

    return new NodemailerAuthEmailSender(transporter, config.from);
}
