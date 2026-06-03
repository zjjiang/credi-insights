import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'
import { existsSync } from 'fs'

const fontCandidates = [
  path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.ttf'),
  path.join(process.cwd(), 'public/fonts/STHeitiMedium.ttf'),
  '/Library/Fonts/Arial Unicode.ttf',
]

const fontPath = fontCandidates.find(existsSync) ?? fontCandidates[0]

Font.register({ family: 'Chinese', src: fontPath })

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Chinese', fontSize: 9 },
  title: { fontSize: 16, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 10, textAlign: 'center', color: '#666', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingVertical: 3 },
  summaryGrid: { flexDirection: 'row', marginBottom: 16 },
  summaryBox: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 4, marginHorizontal: 2 },
  summaryLabel: { fontSize: 8, color: '#666' },
  summaryValue: { fontSize: 14, marginTop: 2 },
  red: { color: '#dc2626' },
  green: { color: '#16a34a' },
})

export interface ReportProps {
  billingStart: string
  billingEnd: string
  cardLast4: string | null
  totalDebit: number
  totalCredit: number
  txCount: number
  byCategory: Array<{ categoryName: string; amount: number; percentage: number }>
  topMerchants: Array<{ merchant: string; amount: number; count: number }>
  topTransactions: Array<{ txDate: string; merchant: string; amount: number; categoryName: string }>
  tips: string[]
}

export function SpendingReportDocument(props: ReportProps) {
  const { billingStart, billingEnd, cardLast4, totalDebit, totalCredit, txCount, byCategory, topMerchants, topTransactions, tips } = props
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>招商银行信用卡消费报告</Text>
        <Text style={styles.subtitle}>
          账期 {billingStart} ~ {billingEnd}{cardLast4 ? `  卡号尾号 ${cardLast4}` : ''}
        </Text>

        {/* Summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>总支出</Text>
            <Text style={[styles.summaryValue, styles.red]}>¥{totalDebit.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>交易笔数</Text>
            <Text style={styles.summaryValue}>{txCount}</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>分类汇总</Text>
          <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
            <Text style={{ width: '40%' }}>分类</Text>
            <Text style={{ width: '30%', textAlign: 'right' }}>金额</Text>
            <Text style={{ width: '30%', textAlign: 'right' }}>占比</Text>
          </View>
          {byCategory.map((cat, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ width: '40%' }}>{cat.categoryName}</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>¥{cat.amount.toFixed(2)}</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{cat.percentage.toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        {/* Top Transactions (大额) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>大额消费 Top 10</Text>
          <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
            <Text style={{ width: '15%' }}>日期</Text>
            <Text style={{ width: '45%' }}>商户</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>金额</Text>
            <Text style={{ width: '20%', textAlign: 'right' }}>分类</Text>
          </View>
          {topTransactions.map((tx, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ width: '15%' }}>{tx.txDate}</Text>
              <Text style={{ width: '45%' }}>{tx.merchant}</Text>
              <Text style={{ width: '20%', textAlign: 'right', color: '#dc2626' }}>¥{tx.amount.toFixed(2)}</Text>
              <Text style={{ width: '20%', textAlign: 'right' }}>{tx.categoryName}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>省钱建议</Text>
          {tips.map((tip, i) => (
            <Text key={i} style={{ marginBottom: 6, lineHeight: 1.4 }}>• {tip}</Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
