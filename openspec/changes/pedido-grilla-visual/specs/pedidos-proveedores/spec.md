## ADDED Requirements

### Requirement: Legibilidad de la grilla de carga de ítems del pedido

La pantalla de creación de pedido SHALL presentar los ítems como una grilla estructurada que permita atribuir cada valor a su ítem y a su columna sin ambigüedad, incluso con decenas de ítems cargados.

La grilla SHALL delimitar sus celdas con separadores visibles tanto entre filas como entre columnas. Los encabezados de columna SHALL permanecer visibles mientras el usuario recorre la lista de ítems. Cada ítem SHALL leerse como una unidad visual única junto con todo el contenido auxiliar que dependa de él —el editor de descuentos desplegado, el sub-formulario de producto nuevo y los avisos propios de esa línea—, de modo que ese contenido auxiliar SHALL NOT presentarse como si fuera un ítem independiente.

Los valores numéricos de una misma columna SHALL alinear sus dígitos entre filas. Cuando el espacio disponible obligue a recortar un texto compuesto por una etiqueta y un valor —como un descuento con su nombre y su porcentaje—, el recorte SHALL aplicarse a la etiqueta y SHALL NOT ocultar el valor.

La grilla SHALL entrar completa en el ancho disponible en los anchos de pantalla en los que se muestra como grilla, incluida la variante con columna de moneda extranjera, sin recortar ninguna columna y sin recurrir a desplazamiento horizontal.

Esta presentación SHALL NOT alterar ningún comportamiento existente de la pantalla: la carga y edición de cada campo por línea, la apertura y cierre del editor de descuentos, la exigencia de elegir proveedor antes de cargar ítems, la continuidad del borrador en curso y el contenido enviado al servidor SHALL permanecer idénticos.

#### Scenario: Atribución de un valor a su ítem con la lista cargada

- **WHEN** el usuario tiene 30 ítems cargados y mira el valor de la columna de costo total de un ítem del medio de la lista
- **THEN** separadores visibles de fila y de columna delimitan esa celda, y la fila completa se distingue de las adyacentes al recorrerla con el puntero

#### Scenario: Los encabezados siguen disponibles al recorrer la lista

- **WHEN** el usuario desplaza la pantalla hasta el ítem 25 de un pedido de 30 ítems
- **THEN** la fila de encabezados de columna sigue visible sobre la grilla y ninguna fila de ítems se ve a través de ella

#### Scenario: El buscador de producto no queda tapado por los encabezados

- **WHEN** el usuario abre el buscador de producto de la primera fila visible mientras los encabezados están fijos arriba
- **THEN** la lista de resultados se muestra por encima de los encabezados y todas sus opciones son alcanzables

#### Scenario: Abrir los descuentos no parte el ítem en dos

- **WHEN** el usuario hace clic en la celda de descuentos de un ítem y se despliega el editor
- **THEN** el editor se muestra asociado visualmente a ese ítem, sin ningún separador de fila entre el ítem y su editor, y el siguiente ítem sigue leyéndose como una fila distinta

#### Scenario: Un aviso propio de la línea no se lee como otro ítem

- **WHEN** un ítem dispara el aviso de que su costo es mayor al de la ficha del producto
- **THEN** el aviso se presenta asociado visualmente a ese ítem y no como una fila independiente de la grilla

#### Scenario: Comparación de importes entre filas

- **WHEN** el usuario recorre verticalmente la columna de costo total de un pedido con importes de distinta cantidad de dígitos
- **THEN** los dígitos de todos los importes quedan alineados entre sí

#### Scenario: Un descuento angosto no oculta su porcentaje

- **WHEN** un descuento con nombre largo no entra completo en el ancho de su celda
- **THEN** el nombre se recorta con puntos suspensivos y el porcentaje se sigue viendo completo

#### Scenario: La grilla entra completa en una pantalla de laptop

- **WHEN** el usuario abre la creación de pedido en una pantalla de 1366 píxeles de ancho con un proveedor que maneja dólares, es decir con la columna de moneda presente
- **THEN** todas las columnas —incluida la acción de quitar ítem— se muestran completas dentro de la pantalla, sin recorte y sin desplazamiento horizontal

#### Scenario: Las filas mantienen sus columnas alineadas entre sí

- **WHEN** el pedido combina ítems con nombres de producto largos y cortos, con y sin descuentos, en pesos y en dólares, y con algún editor de descuentos desplegado
- **THEN** cada columna ocupa exactamente la misma posición horizontal en todas las filas y en la fila de encabezados

#### Scenario: El pulido visual no cambia lo que se envía

- **WHEN** el usuario carga un pedido con una línea de producto existente y una línea de producto nuevo y lo confirma
- **THEN** el contenido enviado al servidor es idéntico al que se enviaba antes del rediseño visual, con los mismos campos y valores por línea

#### Scenario: El estado no editable sigue siendo evidente

- **WHEN** se restaura un borrador con ítems y todavía sin proveedor elegido
- **THEN** las filas se muestran con un aspecto claramente no editable, junto al aviso de que hace falta elegir un proveedor, y ningún campo acepta edición

#### Scenario: Las pantallas angostas siguen mostrando tarjetas

- **WHEN** el usuario abre la creación de pedido en un ancho menor al umbral en el que la grilla se muestra
- **THEN** cada ítem se presenta como tarjeta apilada de ancho completo, con el mismo tratamiento visual de separadores y tamaños, sin desbordar horizontalmente
