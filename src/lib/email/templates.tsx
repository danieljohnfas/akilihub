/**
 * AkiliBrain Email Templates (React Email)
 * All templates share the same base layout and brand colors.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

const BASE_URL = "https://akilibrain.com";
const BRAND_COLOR = "#4F46E5";
const BG_COLOR = "#0a0a0f";
const CARD_BG = "#111118";
const TEXT_MUTED = "#888899";

// ─── Base layout ─────────────────────────────────────────────────────────────

function EmailWrapper({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BG_COLOR,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "580px",
            margin: "0 auto",
            padding: "20px 0 48px",
          }}
        >
          {/* Header */}
          <Section style={{ padding: "32px 24px 24px" }}>
            <Link href={BASE_URL} style={{ textDecoration: "none" }}>
              <Text
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#ffffff",
                  margin: 0,
                  letterSpacing: "-0.5px",
                }}
              >
                Akili<span style={{ color: BRAND_COLOR }}>Brain</span>
              </Text>
            </Link>
          </Section>

          {/* Main card */}
          <Section
            style={{
              backgroundColor: CARD_BG,
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "32px 24px",
              margin: "0 24px",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "24px 24px 0" }}>
            <Text
              style={{
                fontSize: "12px",
                color: TEXT_MUTED,
                textAlign: "center" as const,
                margin: 0,
              }}
            >
              East Africa&apos;s Professional Intelligence Platform ·{" "}
              <Link
                href={`${BASE_URL}/tenders`}
                style={{ color: TEXT_MUTED, textDecoration: "underline" }}
              >
                Tenders
              </Link>{" "}
              ·{" "}
              <Link
                href={`${BASE_URL}/jobs`}
                style={{ color: TEXT_MUTED, textDecoration: "underline" }}
              >
                Jobs
              </Link>{" "}
              ·{" "}
              <Link
                href={`${BASE_URL}/compliance`}
                style={{ color: TEXT_MUTED, textDecoration: "underline" }}
              >
                Compliance
              </Link>
            </Text>
            <Text
              style={{
                fontSize: "11px",
                color: "#555566",
                textAlign: "center" as const,
                marginTop: "8px",
              }}
            >
              © {new Date().getFullYear()} AkiliBrain. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── 1. Welcome / Signup Confirmation ────────────────────────────────────────

export interface WelcomeEmailProps {
  name?: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const greeting = name ? `Hi ${name}` : "Welcome";
  return (
    <EmailWrapper preview="Welcome to AkiliBrain — East Africa's intelligence platform">
      <Heading
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#ffffff",
          margin: "0 0 12px",
        }}
      >
        {greeting} 👋
      </Heading>
      <Text style={{ color: "#ccccdd", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }}>
        You&apos;re now part of <strong style={{ color: "#ffffff" }}>AkiliBrain</strong> — the
        fastest way to track government tenders, job opportunities, business
        compliance, health data, and salaries across East Africa.
      </Text>

      <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "24px 0" }} />

      <Text style={{ color: "#888899", fontSize: "13px", margin: "0 0 16px", fontWeight: "600", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
        What you can do
      </Text>

      {[
        { emoji: "📋", title: "Browse Tenders", desc: "Find open government contracts across Kenya, Tanzania, Uganda, and Rwanda.", href: "/tenders" },
        { emoji: "💼", title: "Find Jobs", desc: "Discover thousands of active job listings updated daily.", href: "/jobs" },
        { emoji: "🏛️", title: "Check Compliance", desc: "Permits, licenses, and regulatory requirements for your business.", href: "/compliance" },
      ].map((item) => (
        <Row key={item.href} style={{ marginBottom: "12px" }}>
          <Column style={{ width: "36px", verticalAlign: "top", paddingTop: "2px" }}>
            <Text style={{ fontSize: "20px", margin: 0 }}>{item.emoji}</Text>
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600", margin: "0 0 2px" }}>
              <Link href={`${BASE_URL}${item.href}`} style={{ color: "#ffffff", textDecoration: "none" }}>
                {item.title}
              </Link>
            </Text>
            <Text style={{ color: TEXT_MUTED, fontSize: "13px", margin: 0 }}>{item.desc}</Text>
          </Column>
        </Row>
      ))}

      <Section style={{ marginTop: "28px", textAlign: "center" as const }}>
        <Button
          href={BASE_URL}
          style={{
            backgroundColor: BRAND_COLOR,
            color: "#ffffff",
            borderRadius: "8px",
            padding: "12px 28px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          Explore AkiliBrain →
        </Button>
      </Section>
    </EmailWrapper>
  );
}

// ─── 2. Tender Alert ─────────────────────────────────────────────────────────

export interface TenderAlertItem {
  id: string;
  title: string;
  authority: string;
  country: string;
  deadline: string;
  budget?: string;
}

export interface TenderAlertEmailProps {
  name?: string;
  tenders: TenderAlertItem[];
  keywords?: string[];
}

export function TenderAlertEmail({ name, tenders, keywords }: TenderAlertEmailProps) {
  const count = tenders.length;
  return (
    <EmailWrapper
      preview={`${count} new tender${count !== 1 ? "s" : ""} matching your alert — ${tenders[0]?.title ?? "View now"}`}
    >
      <Heading
        style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff", margin: "0 0 8px" }}
      >
        📋 {count} New Tender{count !== 1 ? "s" : ""} Found
      </Heading>
      <Text style={{ color: TEXT_MUTED, fontSize: "14px", margin: "0 0 24px" }}>
        {name ? `Hi ${name}, we` : "We"} found {count} new procurement opportunit{count !== 1 ? "ies" : "y"}
        {keywords?.length ? ` matching "${keywords.slice(0, 2).join('", "')}"` : " on AkiliBrain"}.
      </Text>

      {tenders.slice(0, 5).map((tender) => (
        <Section
          key={tender.id}
          style={{
            backgroundColor: "rgba(79,70,229,0.08)",
            border: "1px solid rgba(79,70,229,0.2)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600", margin: "0 0 6px", lineHeight: "1.4" }}>
            <Link href={`${BASE_URL}/tenders/${tender.id}`} style={{ color: "#ffffff", textDecoration: "none" }}>
              {tender.title}
            </Link>
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: "12px", margin: "0 0 8px" }}>
            {tender.authority} · {tender.country}
          </Text>
          <Row>
            <Column>
              <Text style={{ color: "#f59e0b", fontSize: "12px", fontWeight: "600", margin: 0 }}>
                🗓 Deadline: {tender.deadline}
              </Text>
            </Column>
            {tender.budget && (
              <Column style={{ textAlign: "right" as const }}>
                <Text style={{ color: "#10b981", fontSize: "12px", fontWeight: "600", margin: 0 }}>
                  💰 {tender.budget}
                </Text>
              </Column>
            )}
          </Row>
        </Section>
      ))}

      {count > 5 && (
        <Text style={{ color: TEXT_MUTED, fontSize: "13px", textAlign: "center" as const, margin: "8px 0 16px" }}>
          + {count - 5} more tender{count - 5 !== 1 ? "s" : ""}...
        </Text>
      )}

      <Section style={{ marginTop: "20px", textAlign: "center" as const }}>
        <Button
          href={`${BASE_URL}/tenders`}
          style={{
            backgroundColor: BRAND_COLOR,
            color: "#ffffff",
            borderRadius: "8px",
            padding: "12px 28px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          View All Tenders →
        </Button>
      </Section>
    </EmailWrapper>
  );
}

// ─── 3. Job Alert ─────────────────────────────────────────────────────────────

export interface JobAlertItem {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  deadline?: string;
}

export interface JobAlertEmailProps {
  name?: string;
  jobs: JobAlertItem[];
  keywords?: string[];
}

export function JobAlertEmail({ name, jobs, keywords }: JobAlertEmailProps) {
  const count = jobs.length;
  const typeLabel: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    internship: "Internship",
    remote: "Remote",
  };
  return (
    <EmailWrapper
      preview={`${count} new job${count !== 1 ? "s" : ""} matching your alert — ${jobs[0]?.title ?? "View now"}`}
    >
      <Heading
        style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff", margin: "0 0 8px" }}
      >
        💼 {count} New Job{count !== 1 ? "s" : ""} Found
      </Heading>
      <Text style={{ color: TEXT_MUTED, fontSize: "14px", margin: "0 0 24px" }}>
        {name ? `Hi ${name}, we` : "We"} found {count} new job opportunit{count !== 1 ? "ies" : "y"}
        {keywords?.length ? ` matching "${keywords.slice(0, 2).join('", "')}"` : " on AkiliBrain"}.
      </Text>

      {jobs.slice(0, 5).map((job) => (
        <Section
          key={job.id}
          style={{
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: "14px", fontWeight: "600", margin: "0 0 4px" }}>
            <Link href={`${BASE_URL}/jobs/${job.id}`} style={{ color: "#ffffff", textDecoration: "none" }}>
              {job.title}
            </Link>
          </Text>
          <Text style={{ color: TEXT_MUTED, fontSize: "12px", margin: "0 0 8px" }}>
            {job.company} · {job.location}
          </Text>
          <Row>
            <Column>
              <Text style={{ color: "#60a5fa", fontSize: "12px", fontWeight: "600", margin: 0 }}>
                {typeLabel[job.type] ?? job.type}
              </Text>
            </Column>
            {job.deadline && (
              <Column style={{ textAlign: "right" as const }}>
                <Text style={{ color: "#f59e0b", fontSize: "12px", margin: 0 }}>
                  Deadline: {job.deadline}
                </Text>
              </Column>
            )}
          </Row>
        </Section>
      ))}

      {count > 5 && (
        <Text style={{ color: TEXT_MUTED, fontSize: "13px", textAlign: "center" as const, margin: "8px 0 16px" }}>
          + {count - 5} more job{count - 5 !== 1 ? "s" : ""}...
        </Text>
      )}

      <Section style={{ marginTop: "20px", textAlign: "center" as const }}>
        <Button
          href={`${BASE_URL}/jobs`}
          style={{
            backgroundColor: "#d97706",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "12px 28px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          View All Jobs →
        </Button>
      </Section>
    </EmailWrapper>
  );
}

// ─── 4. Password Reset ────────────────────────────────────────────────────────

export interface PasswordResetEmailProps {
  resetLink: string;
  name?: string;
}

export function PasswordResetEmail({ resetLink, name }: PasswordResetEmailProps) {
  return (
    <EmailWrapper preview="Reset your AkiliBrain password">
      <Heading
        style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff", margin: "0 0 12px" }}
      >
        🔐 Reset Your Password
      </Heading>
      <Text style={{ color: "#ccccdd", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }}>
        {name ? `Hi ${name}, we` : "We"} received a request to reset your AkiliBrain password.
        Click the button below to set a new password. This link expires in{" "}
        <strong style={{ color: "#ffffff" }}>1 hour</strong>.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
        <Button
          href={resetLink}
          style={{
            backgroundColor: BRAND_COLOR,
            color: "#ffffff",
            borderRadius: "8px",
            padding: "14px 32px",
            fontSize: "15px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          Reset Password →
        </Button>
      </Section>

      <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "24px 0" }} />

      <Text style={{ color: TEXT_MUTED, fontSize: "12px", margin: 0, lineHeight: "1.6" }}>
        If you didn&apos;t request a password reset, you can safely ignore this email.
        Your password will not change until you click the link above.
      </Text>
    </EmailWrapper>
  );
}
