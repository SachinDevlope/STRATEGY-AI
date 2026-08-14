import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Resume } from "@/lib/resume";

/**
 * Deliberately plain, single-column A4. Columns, tables, and icons are what
 * break ATS parsers, and the built-in Helvetica needs no font download — so the
 * renderer works offline and in a cold serverless function.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    lineHeight: 1.4,
    color: "#111111",
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  headline: { fontSize: 10.5, color: "#444444", marginTop: 2 },
  contactLine: { fontSize: 9, color: "#444444", marginTop: 5 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#111111",
    paddingBottom: 3,
    marginBottom: 7,
  },
  entry: { marginBottom: 9 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  entryMeta: { fontSize: 9, color: "#444444" },
  entrySub: { fontSize: 9.5, color: "#222222", marginTop: 1 },
  bulletRow: { flexDirection: "row", marginTop: 3, paddingRight: 6 },
  bulletMark: { width: 9 },
  skillRow: { flexDirection: "row", marginBottom: 3 },
  skillCategory: { fontFamily: "Helvetica-Bold", width: 96 },
  skillItems: { flex: 1 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMark}>•</Text>
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

/**
 * Returns the `<Document>` element itself rather than a component wrapping it:
 * renderToBuffer() types its argument as ReactElement<DocumentProps>, which a
 * component element with its own props does not satisfy.
 */
export function resumeDocument(resume: Resume) {
  const { contact } = resume;
  // Joined into one line so the header stays two rows tall regardless of how
  // many links the candidate supplied.
  const contactParts = [contact.email, contact.phone, contact.location].filter(Boolean);
  const linkParts = contact.links.map((link) => `${link.label}: ${link.url}`);

  return (
    <Document
      title={`${contact.fullName} — Resume`}
      author={contact.fullName}
      creator="Strategy-AI"
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{contact.fullName}</Text>
          {resume.headline ? <Text style={styles.headline}>{resume.headline}</Text> : null}
          {contactParts.length ? (
            <Text style={styles.contactLine}>{contactParts.join("  ·  ")}</Text>
          ) : null}
          {linkParts.length ? (
            <Text style={styles.contactLine}>{linkParts.join("  ·  ")}</Text>
          ) : null}
        </View>

        {resume.summary ? (
          <Section title="Summary">
            <Text>{resume.summary}</Text>
          </Section>
        ) : null}

        {resume.experience.length ? (
          <Section title="Experience">
            {resume.experience.map((job, index) => (
              <View key={`${job.company}-${index}`} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{job.role}</Text>
                  <Text style={styles.entryMeta}>
                    {job.startDate} – {job.endDate}
                  </Text>
                </View>
                <Text style={styles.entrySub}>
                  {[job.company, job.location].filter(Boolean).join(" · ")}
                </Text>
                {job.bullets.map((bullet, bulletIndex) => (
                  <Bullet key={bulletIndex}>{bullet}</Bullet>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.skills.length ? (
          <Section title="Skills">
            {resume.skills.map((group, index) => (
              <View key={`${group.category}-${index}`} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{group.category}</Text>
                <Text style={styles.skillItems}>{group.items.join(", ")}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {resume.projects.length ? (
          <Section title="Projects">
            {resume.projects.map((project, index) => (
              <View key={`${project.name}-${index}`} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>{project.name}</Text>
                <Text style={styles.entrySub}>{project.description}</Text>
                {project.link ? <Text style={styles.entryMeta}>{project.link}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.education.length ? (
          <Section title="Education">
            {resume.education.map((school, index) => (
              <View key={`${school.institution}-${index}`} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{school.institution}</Text>
                  <Text style={styles.entryMeta}>
                    {[school.startDate, school.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                <Text style={styles.entrySub}>
                  {[school.degree, school.field].filter(Boolean).join(", ")}
                </Text>
                {school.detail ? <Text style={styles.entryMeta}>{school.detail}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {resume.certifications.length ? (
          <Section title="Certifications">
            {resume.certifications.map((certification, index) => (
              <Bullet key={index}>{certification}</Bullet>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}

export default resumeDocument;
