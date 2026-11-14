import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HScroll } from './home';
import { colors, fonts, spacing } from '../theme';

const DAYS = 14;
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
/** A reserva tem de ser para daqui a pelo menos esta margem. */
const MARGIN_MS = 30 * 60_000;

const at = (day: Date, hour: number) => { const d = new Date(day); d.setHours(hour, 0, 0, 0); return d; };

/** Escolha da data e da hora do serviço: os próximos dias e as horas livres de cada um. */
export function SchedulePicker({ onChange }: { onChange: (d: Date | null) => void }) {
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);
  const free = (day: Date) => HOURS.filter((h) => at(day, h).getTime() > Date.now() + MARGIN_MS);
  const [day, setDay] = useState<Date | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const pick = (d: Date, h: number | null) => {
    setDay(d);
    setHour(h);
    onChange(h === null ? null : at(d, h));
  };
  return (
    <View>
      <HScroll>
        {days.map((d) => {
          const active = day?.getTime() === d.getTime();
          const none = free(d).length === 0;
          return (
            <Pressable key={d.getTime()} disabled={none} onPress={() => pick(d, free(d).includes(hour ?? -1) ? hour : null)}
              style={{ width: 54, paddingVertical: 8, marginRight: 8, borderRadius: 14, alignItems: 'center', opacity: none ? 0.4 : 1, backgroundColor: active ? colors.navy : colors.tint }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: active ? '#fff' : colors.muted }}>{d.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '')}</Text>
              <Text style={{ fontFamily: fonts.heading, fontSize: 17, color: active ? '#fff' : colors.text }}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </HScroll>
      {day && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
          {free(day).map((h) => (
            <Pressable key={h} onPress={() => pick(day, h)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: hour === h ? colors.primary : colors.tint }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: hour === h ? colors.navy : colors.accent }}>{String(h).padStart(2, '0')}:00</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
