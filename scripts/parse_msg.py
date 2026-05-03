#!/usr/bin/env python3
import sys
import json
import re
import argparse
from html.parser import HTMLParser
import extract_msg


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            s = data.strip()
            if s:
                self.text.append(s)


def extract_text(html_bytes: bytes) -> list[str]:
    p = TextExtractor()
    p.feed(html_bytes.decode('utf-8', errors='ignore'))
    return p.text


def parse_transactions(lines: list[str]) -> list[dict]:
    """
    招商银行账单格式（消费/退款/分期区块）：
    [交易日] [入账日] 商户名 ¥ 金额 卡号 [CN/US] 金额
    还款区块：[日期] 商户名 ¥ 金额 卡号 金额
    """
    transactions = []
    section = None  # 'consume' | 'refund' | 'installment' | 'repay'
    i = 0

    section_map = {
        '消费': 'DEBIT',
        '退款': 'CREDIT',
        '分期': 'DEBIT',
        '还款': 'CREDIT',
    }

    date_re = re.compile(r'^(\d{4})$')
    amount_re = re.compile(r'^¥\s*([-\d,]+\.?\d*)$')

    while i < len(lines):
        line = lines[i]

        if line in section_map:
            section = line
            i += 1
            continue

        if section is None:
            i += 1
            continue

        # Try to match a transaction block
        # Pattern: date [date] merchant ¥amount card [country] rawAmount
        if date_re.match(line):
            tx_date_raw = line
            j = i + 1

            # Optional second date (入账日)
            if j < len(lines) and date_re.match(lines[j]):
                j += 1

            if j >= len(lines):
                i += 1
                continue

            merchant = lines[j]
            j += 1

            if j >= len(lines) or not amount_re.match(lines[j]):
                i += 1
                continue

            amount_str = amount_re.match(lines[j]).group(1).replace(',', '')
            amount = float(amount_str)
            j += 1

            # card last4
            card_last4 = None
            if j < len(lines) and re.match(r'^\d{4}$', lines[j]):
                card_last4 = lines[j]
                j += 1

            # optional country code
            if j < len(lines) and re.match(r'^[A-Z]{2}$', lines[j]):
                j += 1

            # raw amount (skip)
            if j < len(lines) and re.match(r'^-?[\d,]+\.?\d*$', lines[j]):
                j += 1

            # Parse date: MMDD → 2026-MM-DD (assume current year context)
            month = int(tx_date_raw[:2])
            day = int(tx_date_raw[2:])
            year = 2026
            tx_date = f"{year}-{month:02d}-{day:02d}T00:00:00"

            tx_type = 'CREDIT' if section in ('退款', '还款') else 'DEBIT'
            if amount < 0:
                tx_type = 'CREDIT'
                amount = abs(amount)

            transactions.append({
                'txDate': tx_date,
                'merchant': merchant,
                'amount': amount,
                'currency': 'CNY',
                'type': tx_type,
                'cardLast4': card_last4,
                'txStatus': '已入账',
            })

            i = j
            continue

        i += 1

    return transactions


def parse(file_path: str) -> dict:
    msg = extract_msg.openMsg(file_path)
    html_body = msg.htmlBody or b''
    lines = extract_text(html_body)

    image_month = None
    card_last4 = None
    billing_start = None
    billing_end = None
    due_date = None

    for line in lines[:30]:
        # 账期：2026/03/16-2026/04/15
        m = re.match(r'^(\d{4}/\d{2}/\d{2})-(\d{4}/\d{2}/\d{2})$', line.strip())
        if m:
            billing_start = m.group(1).replace('/', '-')
            billing_end = m.group(2).replace('/', '-')
            image_month = billing_end[:7]  # 取账期结束月份
        # 还款日：2026/05/03（单独一行，在账期行之后）
        m2 = re.match(r'^(\d{4}/\d{2}/\d{2})$', line.strip())
        if m2 and billing_end and not due_date:
            due_date = m2.group(1).replace('/', '-')

    transactions = parse_transactions(lines)
    if transactions and not card_last4:
        card_last4 = transactions[0].get('cardLast4')

    if not image_month and transactions:
        from collections import Counter
        dates = [t['txDate'][:7] for t in transactions]
        image_month = Counter(dates).most_common(1)[0][0]

    return {
        'imageMonth': image_month,
        'billingStart': billing_start,
        'billingEnd': billing_end,
        'dueDate': due_date,
        'cardLast4': card_last4,
        'rawText': '\n'.join(lines),
        'transactions': transactions,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    args = parser.parse_args()
    result = parse(args.file)
    print(json.dumps(result, ensure_ascii=False, default=str))
