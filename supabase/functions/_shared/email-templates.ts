type BaseEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

const esc = (value: string): string => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#39;");

const appCard = (title: string, subtitle: string, bodyHtml: string): string => `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#059669,#10b981);padding:18px 20px;color:#fff;">
        <div style="font-size:16px;font-weight:800;letter-spacing:0.2px;">SpendNote</div>
        <div style="font-size:20px;font-weight:900;margin-top:4px;">${title}</div>
        <div style="font-size:13px;opacity:0.95;margin-top:4px;">${subtitle}</div>
      </div>
      <div style="padding:18px 20px;">${bodyHtml}</div>
      <div style="padding:14px 20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
        Cash handoff documentation only. Not a tax or accounting tool.<br>
        &copy; SpendNote • <a href="https://spendnote.app" style="color:#6b7280;">spendnote.app</a>
      </div>
    </div>
  </div>
`;

export const renderInviteEmailTemplate = (args: {
  inviterLine: string;
  role: "Admin" | "User";
  inviteLink: string;
  subject?: string;
}): BaseEmailTemplate => {
  const inviter = esc(args.inviterLine || "A team member");
  const role = args.role === "Admin" ? "Admin" : "User";
  const inviteLink = esc(args.inviteLink || "");
  const subject = String(args.subject || "You have been invited to SpendNote");

  const html = appCard(
    "You’ve been invited",
    "Join your team in SpendNote",
    `
      <p style="margin:0 0 10px;">${inviter} invited you to join their SpendNote team.</p>
      <p style="margin:0 0 14px;">Role: <strong>${role}</strong></p>
      <div style="margin:18px 0 16px;">
        <a href="${inviteLink}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;">Accept invitation</a>
      </div>
      <p style="margin:0 0 10px;color:#374151;">If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style="margin:0 0 16px;"><a href="${inviteLink}" style="color:#1d4ed8;word-break:break-all;">${inviteLink}</a></p>
      <p style="margin:0;color:#6b7280;">If you didn’t expect this invite, you can ignore this email.</p>
    `,
  );

  const text = `SpendNote invitation\n\n${args.inviterLine} invited you to join SpendNote as ${role}.\n\nAccept invitation:\n${args.inviteLink}\n\nIf you didn’t expect this invite, you can ignore this email.`;

  return { subject, html, text };
};

export const renderWelcomeAccountCreatedTemplate = (args: {
  fullName?: string;
  loginUrl: string;
}): BaseEmailTemplate => {
  const name = esc(String(args.fullName || "there").trim() || "there");
  const loginUrl = esc(args.loginUrl || "https://spendnote.app/spendnote-login.html");
  const subject = "Welcome to SpendNote";

  const html = appCard(
    "Welcome to SpendNote",
    "Your account is ready",
    `
      <p style="margin:0 0 10px;">Hi ${name}, your SpendNote account has been created successfully.</p>
      <p style="margin:0 0 14px;">You can now log in, create your first cash box, and start documenting cash handoffs.</p>
      <div style="margin:18px 0 16px;">
        <a href="${loginUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;">Open SpendNote</a>
      </div>
      <p style="margin:0;color:#6b7280;">Need help? Reply to this email and we’ll help you get started.</p>
    `,
  );

  const text = `Welcome to SpendNote\n\nHi ${args.fullName || "there"}, your account is ready.\nOpen SpendNote: ${args.loginUrl}`;
  return { subject, html, text };
};

export const renderEmailConfirmationTemplate = (args: {
  fullName?: string;
  confirmUrl: string;
}): BaseEmailTemplate => {
  const name = esc(String(args.fullName || "there").trim() || "there");
  const confirmUrl = esc(args.confirmUrl || "");
  const subject = "Confirm your SpendNote email address";

  const html = appCard(
    "Confirm your email",
    "One quick step to activate your account",
    `
      <p style="margin:0 0 10px;">Hi ${name}, please confirm your email address to activate your SpendNote account.</p>
      <div style="margin:18px 0 16px;">
        <a href="${confirmUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;">Confirm email</a>
      </div>
      <p style="margin:0 0 10px;color:#374151;">If the button doesn’t work, use this link:</p>
      <p style="margin:0 0 16px;"><a href="${confirmUrl}" style="color:#1d4ed8;word-break:break-all;">${confirmUrl}</a></p>
      <p style="margin:0;color:#6b7280;">If you didn’t create this account, you can safely ignore this email.</p>
    `,
  );

  const text = `Confirm your SpendNote email\n\nHi ${args.fullName || "there"}, confirm your account:\n${args.confirmUrl}`;
  return { subject, html, text };
};

export const renderInviteAcceptedAdminTemplate = (args: {
  adminName?: string;
  acceptedUserName?: string;
  acceptedUserEmail: string;
  orgName?: string;
  teamUrl: string;
}): BaseEmailTemplate => {
  const adminName = esc(String(args.adminName || "there").trim() || "there");
  const acceptedUser = esc(String(args.acceptedUserName || "A user").trim() || "A user");
  const acceptedUserEmail = esc(args.acceptedUserEmail || "");
  const orgName = esc(String(args.orgName || "your team").trim() || "your team");
  const teamUrl = esc(args.teamUrl || "https://spendnote.app/spendnote-team.html");
  const subject = `${args.acceptedUserName || args.acceptedUserEmail || "A user"} accepted your SpendNote invite`;

  const html = appCard(
    "Invite accepted",
    "A team member is now active",
    `
      <p style="margin:0 0 10px;">Hi ${adminName},</p>
      <p style="margin:0 0 10px;"><strong>${acceptedUser}</strong> (${acceptedUserEmail}) accepted your invitation and joined ${orgName}.</p>
      <div style="margin:18px 0 16px;">
        <a href="${teamUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;">Open team settings</a>
      </div>
      <p style="margin:0;color:#6b7280;">You can now manage cash box access from Team settings.</p>
    `,
  );

  const text = `Invite accepted\n\nHi ${args.adminName || "there"}, ${args.acceptedUserName || args.acceptedUserEmail} accepted your invitation and joined ${args.orgName || "your team"}.\nOpen team settings: ${args.teamUrl}`;
  return { subject, html, text };
};
