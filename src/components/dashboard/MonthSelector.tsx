"use client";

import { Button, DatePicker } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const value = dayjs().year(year).month(month - 1).date(1);

  function shift(delta: number) {
    const next = value.add(delta, "month");
    onChange(next.year(), next.month() + 1);
  }

  function handlePick(d: Dayjs | null) {
    if (!d) return;
    onChange(d.year(), d.month() + 1);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="text"
        shape="circle"
        icon={<LeftOutlined />}
        onClick={() => shift(-1)}
        aria-label="上个月"
      />
      <DatePicker
        picker="month"
        value={value}
        allowClear={false}
        format="YYYY年MM月"
        onChange={handlePick}
        style={{ width: 120 }}
      />
      <Button
        type="text"
        shape="circle"
        icon={<RightOutlined />}
        onClick={() => shift(1)}
        aria-label="下个月"
      />
    </div>
  );
}
