/* ============================================
   REI DO SANDUÍCHE — Admin: Fichas Técnicas
   ============================================ */

const AdminFichas = (() => {

  function seedFichas() {
    const existing = DB.getAll(DB.COLLECTIONS.fichas_tecnicas);
    if (existing.length > 0) return;

    // Formato compacto: [nome, categoria, [[ingrediente, qtd, unidade], ...]]
    const dados = [
      // ── Sanduíches Frango ──
      ['FRANGO COM VERDURA','Sanduíches',[['Frango 75g',1,'un'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FRANGO','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FRANGO CATUPIRY','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Catupiry',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X EGGS FRANGO','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FRANGO A MODA','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Bacon',20,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MASTER FRANGO','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['SUPER FRANGO','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Bacon',20,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['TOP FRANGO','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Calabresa',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['SUPER CALABRESA','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Calabresa',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['BIG SUPER','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Salsicha',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['FRANGO ESPECIAL','Sanduíches',[['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['FRANGO COM CARNE','Sanduíches',[['Frango 75g',1,'un'],['Carne 100g',1,'un'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FRANGO COM CARNE','Sanduíches',[['Frango 75g',1,'un'],['Carne 100g',1,'un'],['Mussarela',30,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MASTER CARNE','Sanduíches',[['Frango 75g',1,'un'],['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['SUPER CARNE','Sanduíches',[['Frango 75g',1,'un'],['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Bacon',20,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['TOP CARNE','Sanduíches',[['Frango 75g',1,'un'],['Carne 100g',1,'un'],['Mussarela',30,'g'],['Calabresa',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Sanduíches Carne ──
      ['HAMBURGUER','Sanduíches',[['Carne 100g',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X BURGUER','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['EGGS BURGUER','Sanduíches',[['Carne 100g',1,'un'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X BACON','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Bacon',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['AMERICANO','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['PRÉ X BURGUER','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['BAURÚ','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X HAVAÍ','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X SALADA','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['A MODA','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['A MODA COM CALABRESA','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Calabresa',50,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['BIG BAGUNÇA','Sanduíches',[['Carne 100g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Salsicha',50,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X TUDO','Sanduíches',[['Carne 100g',1,'un'],['Frango 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Salsicha',50,'g'],['Milho',10,'g'],['Passas',10,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X CALABRESA','Sanduíches',[['Calabresa',100,'g'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X CALABRESA COM CARNE','Sanduíches',[['Carne 100g',1,'un'],['Calabresa',50,'g'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Sanduíches Carne do Sol ──
      ['X CARNE DO SOL','Sanduíches',[['Carne do Sol 75g',1,'un'],['Mussarela',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['EGGS CARNE DO SOL','Sanduíches',[['Carne do Sol 75g',1,'un'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X EGGS CARNE DO SOL','Sanduíches',[['Carne do Sol 75g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MASTER CARNE DO SOL','Sanduíches',[['Carne do Sol 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X CARNE DO SOL C/ BACON','Sanduíches',[['Carne do Sol 75g',1,'un'],['Mussarela',30,'g'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['CARNE DO SOL A MODA','Sanduíches',[['Carne do Sol 75g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Sanduíches Filé ──
      ['FILÉ COM VERDURA','Sanduíches',[['Filé 120g',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FILÉ','Sanduíches',[['Filé 120g',1,'un'],['Mussarela',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['EGGS FILÉ','Sanduíches',[['Filé 120g',1,'un'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X EGGS FILÉ','Sanduíches',[['Filé 120g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MASTER FILÉ','Sanduíches',[['Filé 120g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X FILÉ C/ BACON','Sanduíches',[['Filé 120g',1,'un'],['Mussarela',30,'g'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['FILÉ A MODA','Sanduíches',[['Filé 120g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Sanduíches Pernil ──
      ['PERNIL COM VERDURA','Sanduíches',[['Pernil 130g',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X PERNIL','Sanduíches',[['Pernil 130g',1,'un'],['Mussarela',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['EGGS PERNIL','Sanduíches',[['Pernil 130g',1,'un'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X EGGS PERNIL','Sanduíches',[['Pernil 130g',1,'un'],['Mussarela',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MASTER PERNIL','Sanduíches',[['Pernil 130g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X PERNIL C/ BACON','Sanduíches',[['Pernil 130g',1,'un'],['Mussarela',30,'g'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['PERNIL A MODA','Sanduíches',[['Pernil 130g',1,'un'],['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Sanduíches Outros ──
      ['QUEIJO','Sanduíches',[['Mussarela',30,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['MISTO','Sanduíches',[['Mussarela',30,'g'],['Presunto',30,'g'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['X EGGS','Sanduíches',[['Mussarela',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Alface',1,'un'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      ['CACHORRO QUENTE ESPECIAL','Sanduíches',[['Salsicha',100,'g'],['Mussarela',30,'g'],['Milho',10,'g'],['Batata palha',15,'g'],['Tomate',35,'g'],['Maiosene',25,'g'],['Pão Genérico',1,'un'],['Saco sanduíche',1,'un']]],
      // ── Pastéis ──
      ['PASTEL QUEIJO','Pastéis',[['Coalho',45,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL CATUPIRY','Pastéis',[['Coalho',45,'g'],['Catupiry',120,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL MISTO','Pastéis',[['Coalho',45,'g'],['Presunto',45,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL FRANGO','Pastéis',[['Frango 75g',1,'un'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL FRANGO COM QUEIJO','Pastéis',[['Frango 75g',1,'un'],['Coalho',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL FRANGO COM CATUPIRY','Pastéis',[['Frango 75g',1,'un'],['Catupiry',60,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['MASTER PASTEL','Pastéis',[['Frango 75g',1,'un'],['Coalho',30,'g'],['Presunto',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['TOP PASTEL','Pastéis',[['Frango 75g',1,'un'],['Coalho',30,'g'],['Presunto',30,'g'],['Calabresa',55,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL CARNE','Pastéis',[['Carne 100g',1,'un'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL CARNE COM QUEIJO','Pastéis',[['Carne 100g',1,'un'],['Coalho',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['SUPER PASTEL','Pastéis',[['Carne 100g',1,'un'],['Coalho',30,'g'],['Presunto',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL MEDALHÃO','Pastéis',[['Carne 100g',1,'un'],['Coalho',30,'g'],['Presunto',30,'g'],['Ovos',1,'un'],['Bacon',20,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL CARNE DO SOL','Pastéis',[['Carne do Sol 75g',1,'un'],['Coalho',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['BIG PASTEL','Pastéis',[['Carne do Sol 75g',1,'un'],['Coalho',30,'g'],['Presunto',30,'g'],['Milho',10,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL DE CHOCOLATE','Pastéis',[['Chocolate Harald',130,'g'],['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      ['PASTEL DE VENTO','Pastéis',[['Massa pastel',130,'g'],['Embalagem pastel',1,'un'],['Papel toalha',1,'un']]],
      // ── Porções ──
      ['PORÇÃO BATATA FRITA P','Porções',[['Batata frita',150,'g'],['Gordura Vegetal',50,'g']]],
      ['PORÇÃO BATATA FRITA G','Porções',[['Batata frita',250,'g'],['Gordura Vegetal',50,'g']]],
      ['PORÇÃO BATATA FRITA CARNE DO SOL','Porções',[['Batata frita',250,'g'],['Carne do Sol 75g',1,'un'],['Cheddar',150,'g'],['Gordura Vegetal',50,'g']]],
      ['PORÇÃO BATATA FRITA ESPECIAL','Porções',[['Batata frita',250,'g'],['Cheddar',150,'g'],['Bacon',60,'g'],['Gordura Vegetal',50,'g']]],
      ['BATATA FRITA PROMOÇÃO','Porções',[['Batata frita',120,'g'],['Gordura Vegetal',50,'g']]],
      ['BATATA FRITA COMBO','Porções',[['Batata frita',200,'g'],['Gordura Vegetal',50,'g']]],
      // ── Milkshakes ──
      ['MILKSHAKE MORANGO','Milkshakes',[['Sorvete morango',1,'un'],['Leite',150,'ml'],['Cobertura morango',1,'un'],['Canudo',1,'un']]],
      ['MILKSHAKE CHOCOLATE','Milkshakes',[['Sorvete chocolate',1,'un'],['Leite',150,'ml'],['Cobertura chocolate',1,'un'],['Canudo',1,'un']]],
      ['MILKSHAKE OVOMALTINE','Milkshakes',[['Sorvete flocos',1,'un'],['Leite',150,'ml'],['Cobertura chocolate',1,'un'],['Ovomaltine',1,'un'],['Canudo',1,'un']]],
      // ── Sucos ──
      ['SUCO ABACAXI','Sucos',[['Abacaxi',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO AÇAÍ','Sucos',[['Açaí',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO ACEROLA','Sucos',[['Acerola',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO AMEIXA','Sucos',[['Ameixa',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO CAJÁ','Sucos',[['Cajá',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO CUPUAÇU','Sucos',[['Cupuaçu',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO GOIABA','Sucos',[['Goiaba',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO GRAVIOLA','Sucos',[['Graviola',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO LARANJA','Sucos',[['Laranja',5,'un'],['Canudo',1,'un']]],
      ['SUCO MANGA','Sucos',[['Manga',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO MARACUJÁ','Sucos',[['Maracujá',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO MORANGO','Sucos',[['Morango',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO MORANGO COM LARANJA','Sucos',[['Morango',1,'un'],['Laranja',3,'un'],['Água',100,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      ['SUCO SAPOTI','Sucos',[['Sapoti',1,'un'],['Água',200,'ml'],['Açúcar',30,'g'],['Canudo',1,'un']]],
      // ── Vitaminas ──
      ['VITAMINA ABACAXI','Vitaminas',[['Abacaxi',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA AÇAÍ','Vitaminas',[['Açaí',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA ACEROLA','Vitaminas',[['Acerola',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA AMEIXA','Vitaminas',[['Ameixa',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA CAJÁ','Vitaminas',[['Cajá',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA CUPUAÇU','Vitaminas',[['Cupuaçu',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA GOIABA','Vitaminas',[['Goiaba',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA GRAVIOLA','Vitaminas',[['Graviola',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA MANGA','Vitaminas',[['Manga',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA MARACUJÁ','Vitaminas',[['Maracujá',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA MORANGO','Vitaminas',[['Morango',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      ['VITAMINA SAPOTI','Vitaminas',[['Sapoti',1,'un'],['Leite',300,'ml'],['Açúcar',40,'g'],['Canudo',1,'un']]],
      // ── Preparo ──
      ['MAIONESE TEMPERADA - 3,5KG','Preparo',[['Maiosene',3000,'g'],['Ketchup',220,'g'],['Mostarda',200,'g'],['Orégano',20,'g'],['Cebola',1,'un'],['Alho',100,'g'],['Saco temperada',1,'un'],['Cream Cheese',80,'g']]]
    ];

    dados.forEach(([nome, categoria, ings]) => {
      DB.insert(DB.COLLECTIONS.fichas_tecnicas, {
        nome,
        categoria,
        ingredientes: ings.map(([insumoNome, quantidade, unidade]) => ({ insumoNome, quantidade, unidade })),
        ativo: true
      });
    });
  }

  function render() {
    seedFichas();
    const fichas = DB.getAll(DB.COLLECTIONS.fichas_tecnicas);
    const categorias = [...new Set(fichas.map(f => f.categoria))].sort();

    let html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem">';
    html += '<div class="flex items-center gap-4">';
    html += '<span class="badge badge-info">' + fichas.length + ' fichas</span>';
    html += '<span class="badge badge-neutral">' + categorias.length + ' categorias</span>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" onclick="AdminFichas.abrirNovo()">+ Nova Ficha</button>';
    html += '</div>';

    // Filtros
    html += '<div class="card mb-4" style="padding:0.75rem 1rem;display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center">';
    html += '<input class="form-input" type="text" id="busca-ficha" placeholder="Buscar produto..." style="flex:1;min-width:200px;border:none;background:transparent;padding:0">';
    html += '<select class="form-input" id="filtro-cat-ficha" style="width:auto;padding:0.5rem;font-size:0.8125rem"><option value="">Todas categorias</option>';
    categorias.forEach(c => { html += '<option>' + App.escapeHtml(c) + '</option>'; });
    html += '</select></div>';

    // Tabela
    html += '<div class="card" style="padding:0"><div class="table-container" id="tabela-fichas">';
    html += _renderTable(fichas);
    html += '</div></div>';

    document.getElementById('page-content').innerHTML = html;

    // Filtros com debounce
    const busca = document.getElementById('busca-ficha');
    const filtroCat = document.getElementById('filtro-cat-ficha');
    const filtrar = App.debounce(() => {
      const t = busca.value.toLowerCase().trim();
      const c = filtroCat.value;
      const filtrados = fichas.filter(f => {
        if (c && f.categoria !== c) return false;
        if (t && !f.nome.toLowerCase().includes(t)) return false;
        return true;
      });
      document.getElementById('tabela-fichas').innerHTML = _renderTable(filtrados);
    }, 200);
    busca.addEventListener('input', filtrar);
    filtroCat.addEventListener('change', filtrar);
  }

  function _renderTable(fichas) {
    if (!fichas.length) return '<div class="empty-state" style="padding:2rem"><p class="empty-state-title">Nenhuma ficha encontrada</p></div>';

    let html = '<table class="table"><thead><tr><th>Produto</th><th>Categoria</th><th>Ingredientes</th><th>Status</th><th style="text-align:right">Ações</th></tr></thead><tbody>';
    fichas.forEach(f => {
      html += '<tr>';
      html += '<td><span class="font-medium">' + App.escapeHtml(f.nome) + '</span></td>';
      html += '<td class="text-sm">' + App.escapeHtml(f.categoria) + '</td>';
      html += '<td class="text-sm">' + f.ingredientes.length + ' itens</td>';
      html += '<td>';
      if (f.ativo !== false) html += '<span class="badge badge-success">Ativa</span>';
      else html += '<span class="badge badge-danger">Inativa</span>';
      html += '</td>';
      html += '<td style="text-align:right;white-space:nowrap">';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminFichas.visualizar(\'' + f.id + '\')" title="Ver ficha"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
      html += '<button class="btn btn-ghost btn-sm" onclick="AdminFichas.editar(\'' + f.id + '\')" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function visualizar(id) {
    const ficha = DB.getById(DB.COLLECTIONS.fichas_tecnicas, id);
    if (!ficha) return;

    let html = '<div class="modal-overlay active" id="modal-ver-ficha"><div class="modal" style="max-width:550px">';
    html += '<div class="modal-header"><h3>' + App.escapeHtml(ficha.nome) + '</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<div style="display:flex;gap:0.75rem;margin-bottom:1rem">';
    html += '<span class="badge badge-info">' + App.escapeHtml(ficha.categoria) + '</span>';
    html += '<span class="badge badge-neutral">' + ficha.ingredientes.length + ' ingredientes</span>';
    if (ficha.ativo !== false) html += '<span class="badge badge-success">Ativa</span>';
    else html += '<span class="badge badge-danger">Inativa</span>';
    html += '</div>';

    html += '<div class="table-container"><table class="table"><thead><tr><th>Ingrediente</th><th style="text-align:right">Quantidade</th><th>Unidade</th></tr></thead><tbody>';
    ficha.ingredientes.forEach(ing => {
      html += '<tr><td class="font-medium text-sm">' + App.escapeHtml(ing.insumoNome) + '</td>';
      html += '<td style="text-align:right" class="text-sm">' + ing.quantidade + '</td>';
      html += '<td class="text-sm">' + App.escapeHtml(ing.unidade) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '</div>';
    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Fechar</button>';
    html += '<button class="btn btn-primary" onclick="document.getElementById(\'modal-ver-ficha\').remove();AdminFichas.editar(\'' + id + '\')">Editar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();
  }

  function abrirNovo() {
    _abrirModal({ nome: '', categoria: '', ingredientes: [{ insumoNome: '', quantidade: '', unidade: 'g' }], ativo: true });
  }

  function editar(id) {
    const ficha = DB.getById(DB.COLLECTIONS.fichas_tecnicas, id);
    if (ficha) _abrirModal(ficha);
  }

  function _abrirModal(ficha) {
    const isEdit = !!ficha.id;
    const categorias = [...new Set(DB.getAll(DB.COLLECTIONS.fichas_tecnicas).map(f => f.categoria))].sort();
    const insumos = DB.getAll(DB.COLLECTIONS.insumos).filter(i => i.ativo);

    let html = '<div class="modal-overlay active" id="modal-ficha"><div class="modal" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column">';
    html += '<div class="modal-header"><h3>' + (isEdit ? 'Editar Ficha' : 'Nova Ficha Técnica') + '</h3><button class="modal-close">&times;</button></div>';
    html += '<div class="modal-body" style="overflow-y:auto;flex:1">';

    // Nome e Categoria
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">';
    html += '<div class="form-group"><label class="form-label">Produto *</label><input class="form-input" id="ft-nome" value="' + App.escapeHtml(ficha.nome || '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Categoria *</label><input class="form-input" id="ft-cat" list="ft-cat-list" value="' + App.escapeHtml(ficha.categoria || '') + '"><datalist id="ft-cat-list">';
    categorias.forEach(c => { html += '<option value="' + App.escapeHtml(c) + '">'; });
    html += '</datalist></div></div>';

    if (isEdit) {
      html += '<div class="form-group" style="margin-bottom:1rem"><label class="form-label">Status</label><select class="form-input" id="ft-ativo" style="width:auto"><option value="1"' + (ficha.ativo !== false ? ' selected' : '') + '>Ativa</option><option value="0"' + (ficha.ativo === false ? ' selected' : '') + '>Inativa</option></select></div>';
    }

    // Ingredientes
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">';
    html += '<label class="form-label" style="margin:0;font-weight:600">Ingredientes</label>';
    html += '<button class="btn btn-ghost btn-sm" type="button" id="btn-add-ing" style="color:var(--primary)">+ Adicionar</button>';
    html += '</div>';
    html += '<div id="ft-ingredientes">';

    // Datalist de insumos
    html += '<datalist id="ft-insumo-list">';
    insumos.forEach(i => { html += '<option value="' + App.escapeHtml(i.nome) + '">'; });
    html += '</datalist>';

    ficha.ingredientes.forEach((ing, idx) => {
      html += _renderIngRow(idx, ing);
    });
    html += '</div>';

    html += '<input type="hidden" id="ft-id" value="' + (ficha.id || '') + '">';
    html += '<p class="form-error" id="ft-error" style="display:none"></p>';
    html += '</div>';

    html += '<div class="modal-footer"><button class="btn btn-secondary modal-close">Cancelar</button><button class="btn btn-primary" id="btn-salvar-ficha">Salvar</button></div>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
    App.initModals();

    // Adicionar ingrediente
    let ingCount = ficha.ingredientes.length;
    document.getElementById('btn-add-ing').onclick = () => {
      const container = document.getElementById('ft-ingredientes');
      container.insertAdjacentHTML('beforeend', _renderIngRow(ingCount, { insumoNome: '', quantidade: '', unidade: 'g' }));
      ingCount++;
    };

    // Delegação para remover ingrediente
    document.getElementById('ft-ingredientes').addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-remove-ing');
      if (btn) btn.closest('.ing-row').remove();
    });

    // Salvar
    document.getElementById('btn-salvar-ficha').onclick = () => {
      const nome = document.getElementById('ft-nome').value.trim();
      const cat = document.getElementById('ft-cat').value.trim();
      if (!nome || !cat) {
        document.getElementById('ft-error').textContent = 'Nome e categoria são obrigatórios';
        document.getElementById('ft-error').style.display = 'block';
        return;
      }

      const rows = document.querySelectorAll('.ing-row');
      const ingredientes = [];
      rows.forEach(row => {
        const insumoNome = row.querySelector('.ing-nome').value.trim();
        const quantidade = parseFloat(row.querySelector('.ing-qtd').value);
        const unidade = row.querySelector('.ing-un').value;
        if (insumoNome && quantidade > 0) {
          ingredientes.push({ insumoNome, quantidade, unidade });
        }
      });

      if (!ingredientes.length) {
        document.getElementById('ft-error').textContent = 'Adicione pelo menos 1 ingrediente';
        document.getElementById('ft-error').style.display = 'block';
        return;
      }

      const dados = { nome, categoria: cat, ingredientes };
      const id = document.getElementById('ft-id').value;

      if (id) {
        const ativoEl = document.getElementById('ft-ativo');
        if (ativoEl) dados.ativo = ativoEl.value === '1';
        DB.update(DB.COLLECTIONS.fichas_tecnicas, id, dados);
        DB.addLog({ acao: 'EDITAR_FICHA', entidade: 'ficha_tecnica', entidadeId: id, detalhes: 'Editada: ' + nome });
        App.toast('Ficha atualizada!', 'success');
      } else {
        dados.ativo = true;
        const ft = DB.insert(DB.COLLECTIONS.fichas_tecnicas, dados);
        DB.addLog({ acao: 'CADASTRAR_FICHA', entidade: 'ficha_tecnica', entidadeId: ft.id, detalhes: 'Nova: ' + nome + ' (' + ingredientes.length + ' ingredientes)' });
        App.toast('Ficha cadastrada!', 'success');
      }
      document.getElementById('modal-ficha').remove();
      render();
    };
  }

  function _renderIngRow(idx, ing) {
    let html = '<div class="ing-row" style="display:grid;grid-template-columns:1fr 80px 70px 32px;gap:0.5rem;align-items:center;margin-bottom:0.5rem">';
    html += '<input class="form-input ing-nome" list="ft-insumo-list" placeholder="Ingrediente" value="' + App.escapeHtml(ing.insumoNome || '') + '" style="font-size:0.8125rem;padding:0.4rem 0.5rem">';
    html += '<input class="form-input ing-qtd" type="number" step="0.1" min="0" placeholder="Qtd" value="' + (ing.quantidade || '') + '" style="font-size:0.8125rem;padding:0.4rem 0.5rem;text-align:center">';
    html += '<select class="form-input ing-un" style="font-size:0.8125rem;padding:0.4rem 0.25rem">';
    ['g','kg','un','ml','L'].forEach(u => {
      html += '<option value="' + u + '"' + ((ing.unidade || 'g') === u ? ' selected' : '') + '>' + u + '</option>';
    });
    html += '</select>';
    html += '<button type="button" class="btn btn-ghost btn-sm btn-remove-ing" title="Remover" style="padding:0.25rem;color:var(--danger)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    html += '</div>';
    return html;
  }

  return { render, visualizar, editar, abrirNovo, seedFichas };
})();
