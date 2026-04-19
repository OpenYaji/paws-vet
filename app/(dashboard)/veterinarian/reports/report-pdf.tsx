import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#16a34a', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#64748b' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, backgroundColor: '#f1f5f9', padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statBox: { width: '30%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 4 },
  statLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  statSub: { fontSize: 8, color: '#94a3b8', marginTop: 2 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1px solid #f1f5f9' },
  listLabel: { fontSize: 10, color: '#334155', textTransform: 'capitalize' },
  listValue: { fontSize: 10, fontWeight: 'bold', color: '#0f172a' },
  twoColumn: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  column: { width: '48%' },
  emptyText: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }
});

// Helper component for stat boxes
const StatBox = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {sub && <Text style={styles.statSub}>{sub}</Text>}
  </View>
);

// Helper component for rows of data
const DataRow = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.listRow}>
    <Text style={styles.listLabel}>{label.replace(/_/g, " ")}</Text>
    <Text style={styles.listValue}>{value}</Text>
  </View>
);

export default function ReportDocument({ apptData, vetData, dateLabel, period = 'week' }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Clinic Reports</Text>
          {/* Automatically shows "March 2026" or "Mar 8 - Mar 14" */}
          <Text style={styles.subtitle}>Clinical Activity Overview | {dateLabel}</Text>
        </View>

        {/* Appointments Section */}
        {apptData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointments Overview</Text>
            
            <View style={styles.grid}>
              <StatBox label="Total Appointments" value={apptData.total_appointments} sub={dateLabel} />
              {/* Dynamically says "this week" or "this month" */}
              <StatBox label="Completed" value={apptData.by_status?.completed ?? 0} sub={`this ${period}`} />
              <StatBox label="Cancelled / No-show" value={(apptData.by_status?.cancelled ?? 0) + (apptData.by_status?.no_show ?? 0)} sub={`this ${period}`} />
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>By Day</Text>
                {Object.entries(apptData.by_day || {}).map(([day, count]: any) => (
                  <DataRow key={day} label={day} value={count} />
                ))}
              </View>
              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>By Status</Text>
                {Object.entries(apptData.by_status || {}).map(([status, count]: any) => (
                  <DataRow key={status} label={status} value={count} />
                ))}
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, marginTop: 10 }}>By Type</Text>
                {Object.entries(apptData.by_type || {}).map(([type, count]: any) => (
                  <DataRow key={type} label={type} value={count} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Medical Records & Prescriptions Section */}
        {vetData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical & Prescriptions</Text>
            
            <View style={styles.twoColumn}>
              {/* Medical */}
              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Medical Records</Text>
                <Text style={{ fontSize: 10, marginBottom: 6 }}>Total Records: {vetData.medical_records?.total_last_30_days || 0}</Text>
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, marginTop: 10 }}>Top Diagnoses</Text>
                {vetData.medical_records?.top_diagnoses?.length > 0 ? (
                  vetData.medical_records.top_diagnoses.map((d: any, i: number) => (
                    <DataRow key={i} label={d.name} value={d.count} />
                  ))
                ) : (
                  <Text style={styles.emptyText}>No diagnoses recorded.</Text>
                )}
              </View>

              {/* Prescriptions */}
              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Prescriptions</Text>
                <Text style={{ fontSize: 10, marginBottom: 6 }}>Total Prescribed: {vetData.prescriptions?.total || 0}</Text>
                
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, marginTop: 10 }}>Most Prescribed Medications</Text>
                {vetData.prescriptions?.top_medications?.length > 0 ? (
                  vetData.prescriptions.top_medications.map((m: any, i: number) => (
                    <DataRow key={i} label={m.name} value={m.count} />
                  ))
                ) : (
                  <Text style={styles.emptyText}>No medications prescribed.</Text>
                )}
              </View>
            </View>
          </View>
        )}

      </Page>

      {/* Page 2 for Vaccinations */}
      {vetData && vetData.vaccinations && (
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vaccinations Overview</Text>

            <View style={styles.grid}>
              <StatBox label="Total Records" value={vetData.vaccinations.total} />
              <StatBox label="Overdue" value={vetData.vaccinations.overdue_count} sub="past due date" />
              <StatBox label="Due Soon" value={vetData.vaccinations.upcoming_due_count} sub="next 90 days" />
            </View>

            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#dc2626' }}>Overdue Vaccinations</Text>
                {vetData.vaccinations.overdue?.length > 0 ? (
                  vetData.vaccinations.overdue.map((v: any, i: number) => (
                     <View key={i} style={styles.listRow}>
                        <View>
                          <Text style={styles.listLabel}>{v.pet?.name || 'Unknown Pet'}</Text>
                          <Text style={{ fontSize: 8, color: '#64748b' }}>{v.vaccine_name}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: 'bold' }}>
                          {new Date(v.next_due_date).toLocaleDateString()}
                        </Text>
                     </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No overdue vaccinations.</Text>
                )}
              </View>

              <View style={styles.column}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6, color: '#d97706' }}>Upcoming Due</Text>
                {vetData.vaccinations.upcoming_due?.length > 0 ? (
                  vetData.vaccinations.upcoming_due.map((v: any, i: number) => (
                    <View key={i} style={styles.listRow}>
                        <View>
                          <Text style={styles.listLabel}>{v.pet?.name || 'Unknown Pet'}</Text>
                          <Text style={{ fontSize: 8, color: '#64748b' }}>{v.vaccine_name}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#d97706', fontWeight: 'bold' }}>
                          {new Date(v.next_due_date).toLocaleDateString()}
                        </Text>
                     </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No upcoming vaccinations.</Text>
                )}
              </View>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
}