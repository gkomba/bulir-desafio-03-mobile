import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { SchedulePicker } from './SchedulePicker';

/** Hoje é segunda-feira, 16 de novembro de 2026. */
const agora = (hora: number, minuto = 0) => new Date(2026, 10, 16, hora, minuto);
const tocar = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

afterEach(() => jest.useRealTimers());

describe('escolha da data e da hora da reserva', () => {
  it('mostra os próximos 14 dias, a começar hoje', async () => {
    jest.useFakeTimers({ now: agora(7) });
    await render(<SchedulePicker onChange={jest.fn()} />);
    expect(screen.getByText('16')).toBeOnTheScreen();
    expect(screen.getByText('29')).toBeOnTheScreen();
    expect(screen.queryByText('30')).not.toBeOnTheScreen();
  });

  it('só mostra as horas depois de escolher o dia', async () => {
    jest.useFakeTimers({ now: agora(7) });
    await render(<SchedulePicker onChange={jest.fn()} />);
    expect(screen.queryByText('10:00')).not.toBeOnTheScreen();
    await tocar().press(screen.getByText('17'));
    expect(screen.getByText('08:00')).toBeOnTheScreen();
    expect(screen.getByText('18:00')).toBeOnTheScreen();
    expect(screen.queryByText('19:00')).not.toBeOnTheScreen();
  });

  it('devolve a data e a hora escolhidas', async () => {
    jest.useFakeTimers({ now: agora(7) });
    const onChange = jest.fn();
    await render(<SchedulePicker onChange={onChange} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    await user.press(screen.getByText('10:00'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 17, 10, 0, 0, 0));
  });

  it('só escolher o dia ainda não dá uma data: falta a hora', async () => {
    jest.useFakeTimers({ now: agora(7) });
    const onChange = jest.fn();
    await render(<SchedulePicker onChange={onChange} />);
    await tocar().press(screen.getByText('17'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('mudar de dia mantém a hora, se ela estiver livre nesse dia', async () => {
    jest.useFakeTimers({ now: agora(7) });
    const onChange = jest.fn();
    await render(<SchedulePicker onChange={onChange} />);
    const user = tocar();
    await user.press(screen.getByText('17'));
    await user.press(screen.getByText('10:00'));
    await user.press(screen.getByText('18'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 18, 10, 0, 0, 0));
  });

  it('hoje, não oferece horas que faltam menos de 30 minutos', async () => {
    jest.useFakeTimers({ now: agora(8, 10) });
    await render(<SchedulePicker onChange={jest.fn()} />);
    await tocar().press(screen.getByText('16'));
    expect(screen.queryByText('08:00')).not.toBeOnTheScreen();
    expect(screen.getByText('09:00')).toBeOnTheScreen();
  });

  it('a hora que faltam exatamente 30 minutos ainda não serve', async () => {
    jest.useFakeTimers({ now: agora(8, 30) });
    await render(<SchedulePicker onChange={jest.fn()} />);
    await tocar().press(screen.getByText('16'));
    expect(screen.queryByText('09:00')).not.toBeOnTheScreen();
    expect(screen.getByText('10:00')).toBeOnTheScreen();
  });

  it('depois das 17:30 já não há horas hoje, e o dia não se pode escolher', async () => {
    jest.useFakeTimers({ now: agora(17, 40) });
    const onChange = jest.fn();
    await render(<SchedulePicker onChange={onChange} />);
    await tocar().press(screen.getByText('16'));
    expect(screen.queryByText('18:00')).not.toBeOnTheScreen();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('mudar para um dia em que a hora já não está livre limpa a escolha', async () => {
    jest.useFakeTimers({ now: agora(7) });
    const onChange = jest.fn();
    await render(<SchedulePicker onChange={onChange} />);
    const user = tocar();
    await user.press(screen.getByText('16'));
    await user.press(screen.getByText('08:00'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 16, 8, 0, 0, 0));
    jest.setSystemTime(agora(8, 10));
    await user.press(screen.getByText('17'));
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 17, 8, 0, 0, 0));
  });
});
