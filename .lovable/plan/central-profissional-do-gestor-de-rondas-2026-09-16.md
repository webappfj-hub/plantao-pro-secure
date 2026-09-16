# Central profissional do Gestor de Rondas

## Objetivo
Transformar o Gestor de Rondas em uma central operacional ampla, sofisticada e responsiva, preservando integralmente regras, dados e comandos existentes.

## Implementação
- Ampliar a área útil para até 1600 px no desktop e reorganizar o conteúdo em uma grade operacional responsiva, eliminando o grande vazio lateral.
- Unificar a abertura da página e a central de operação em uma faixa superior compacta, evitando títulos e banners duplicados.
- Criar um relógio digital 3D grande, usando a hora oficial sincronizada de Rio Branco/AC, com moldura metálica, vidro, segmentos luminosos, segundos e data brasileira.
- Evoluir o radar existente com anéis, azimutes, ecos sincronizados, varredura e grafismos técnicos, sem inserir mapas ou rastreamento inexistentes.
- Aplicar superfícies de console, grade técnica de fundo, indicadores de conexão e transições físicas discretas aos estados sem turno e com turno.
- No desktop, distribuir seleção, estado do turno e programação em colunas que usem melhor a tela; no celular, manter empilhamento, leitura, toque e áreas seguras.
- Respeitar a preferência de redução de movimento e manter contraste, foco de teclado e textos em português.

## Detalhes técnicos
- Alterar somente a apresentação em `RondasCommand`, `RoundsDashboard` e estilos globais específicos do módulo.
- Reaproveitar `useServerClockParts`, `useLowMotion`, componentes e dados existentes.
- Não alterar banco de dados, autenticação, programação de turnos ou lógica das rondas.

## Validação
- Executar a checagem TypeScript do projeto.
- Revisar o Gestor de Rondas em desktop e celular no navegador.
- Confirmar relógio, radar, rolagem, ausência de sobreposição e comportamento com redução de movimento.
