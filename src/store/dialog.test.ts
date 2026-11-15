import { dialog, useDialog } from './dialog';

beforeEach(() => useDialog.setState({ visible: false, message: '', title: undefined, cancelText: undefined, onConfirm: undefined, destructive: false }));

describe('diálogos da app', () => {
  it('um aviso mostra a mensagem e o título, só com o botão de confirmar', () => {
    dialog.alert('Serviço contratado com sucesso!', 'Sucesso');
    expect(useDialog.getState()).toMatchObject({ visible: true, message: 'Serviço contratado com sucesso!', title: 'Sucesso', confirmText: 'Okay', cancelText: undefined });
  });

  it('uma confirmação tem o botão de cancelar e executa a ação ao confirmar', () => {
    const acao = jest.fn();
    dialog.confirm('Cancelar esta reserva?', acao, { title: 'Cancelar reserva', confirmText: 'Cancelar reserva', destructive: true });
    const d = useDialog.getState();
    expect(d).toMatchObject({ visible: true, cancelText: 'Cancelar', confirmText: 'Cancelar reserva', destructive: true });
    expect(acao).not.toHaveBeenCalled();
    d.onConfirm?.();
    expect(acao).toHaveBeenCalledTimes(1);
  });

  it('um aviso depois de uma confirmação não herda a ação nem o botão de cancelar', () => {
    dialog.confirm('Excluir?', jest.fn(), { destructive: true });
    dialog.alert('Feito');
    expect(useDialog.getState()).toMatchObject({ onConfirm: undefined, cancelText: undefined, destructive: false });
  });

  it('fechar esconde o diálogo', () => {
    dialog.alert('x');
    useDialog.getState().close();
    expect(useDialog.getState().visible).toBe(false);
  });
});
