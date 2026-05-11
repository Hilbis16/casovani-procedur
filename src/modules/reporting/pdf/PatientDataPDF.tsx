import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, marginBottom: 6, marginTop: 14, fontWeight: 'bold' },
  row: { fontSize: 10, marginBottom: 4 },
  meta: { fontSize: 9, color: '#666', marginBottom: 16 },
})

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toISOString().split('T')[0]
}

export const PatientDataPDF = ({
  data,
}: {
  data: { patient: any; timestamp: string; facilityName: string }
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>
        Export osobních údajů — {data.patient.lastName} {data.patient.firstName}
      </Text>
      <Text style={styles.meta}>
        Vygenerováno: {data.timestamp} · {data.facilityName}
      </Text>

      <Text style={styles.sectionTitle}>Základní údaje</Text>
      <Text style={styles.row}>
        Jméno: {data.patient.firstName} {data.patient.lastName}
      </Text>
      <Text style={styles.row}>ID záznamu: {data.patient.id}</Text>
      <Text style={styles.row}>Vytvořen: {fmtDate(data.patient.createdAt)}</Text>

      <Text style={styles.sectionTitle}>Pobyty ({data.patient.stays?.length ?? 0})</Text>
      {(data.patient.stays ?? []).map((stay: any) => (
        <Text key={stay.id} style={styles.row}>
          {stay.code} · {fmtDate(stay.arrivalDate)} – {fmtDate(stay.departureDate)} · Stav:{' '}
          {stay.status}
          {stay.room ? ` · Pokoj: ${stay.room.number}` : ''}
        </Text>
      ))}

      <Text style={styles.sectionTitle}>Procedury ({data.patient.schedules?.length ?? 0})</Text>
      {(data.patient.schedules ?? []).map((s: any) => (
        <Text key={s.id} style={styles.row}>
          {fmtDate(s.date)} {s.startTime}–{s.endTime} · {s.procedure?.name ?? '—'} ·{' '}
          {s.therapist?.lastName ?? '—'} · Stav: {s.status}
        </Text>
      ))}
    </Page>
  </Document>
)
