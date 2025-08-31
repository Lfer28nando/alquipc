(() => {
  'use strict';

  const PRECIO_BASE = 35000;
  const PORC_RECARGO_FUERA = 0.05;
  const PORC_DESC_ESTABLECIMIENTO = 0.05;
  const PORC_DESC_DIA_ADICIONAL = 0.02;

  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  function setError(input, msg){
    const err = input?.parentElement?.querySelector('.error');
    if (err) err.textContent = msg || '';
  }

  function validarTexto(input, min) {
    const valor = (input?.value ?? '').trim();
    if (valor.length < min || !/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/.test(valor)) {
      setError(input, `Ingresa un nombre válido (mínimo ${min} letras).`);
      return null;
    }
    setError(input, '');
    return valor;
  }

  function validarTelefono(input) {
    const valor = (input?.value ?? '').trim();
    if (!/^[0-9]{7,10}$/.test(valor)) {
      setError(input, 'Ingresa un teléfono válido (7 a 10 dígitos).');
      return null;
    }
    setError(input, '');
    return valor;
  }

  function validarEmail(input) {
    const valor = (input?.value ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      setError(input, 'Ingresa un correo válido.');
      return null;
    }
    setError(input, '');
    return valor;
  }

  function validarCampoNumero(input, min, nombreCampo) {
    const valor = Number(input.value);
    if (!Number.isFinite(valor) || input.value.trim() === '') {
      setError(input, `Ingresa ${nombreCampo}.`);
      return null;
    }
    if (valor < min) {
      setError(input, `Debe ser como mínimo ${min}.`);
      return null;
    }
    setError(input, '');
    return Math.floor(valor);
  }

  function opcionSeleccionada(radios) {
    const sel = radios.find(r => r.checked);
    return sel ? sel.value : 'ciudad';
  }

  function generarIdCliente() {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bloque1 = letras[Math.floor(Math.random()*letras.length)] + letras[Math.floor(Math.random()*letras.length)];
    const bloque2 = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${bloque1}-${bloque2}`;
  }

  const formIdentidad = $('#form-identidad');
  const inputNombre = $('#nombre');
  const inputTelefono = $('#telefono');
  const inputEmail = $('#email');
  const paso1 = $('#paso-1');
  const paso2 = $('#paso-2');
  const paso1Tag = $('#paso-1-tag');
  const paso2Tag = $('#paso-2-tag');
  const usuarioMini = $('#usuario-mini');
  const usuarioMiniTexto = $('#usuario-mini-texto');
  const btnEditarIdentidad = $('#btn-editar-identidad');

  function irAPaso2(datos) {
    usuarioMiniTexto.textContent = `${datos.nombre} · ${datos.email}`;
    usuarioMini.classList.remove('oculto');

    paso1Tag.classList.remove('activo');
    paso2Tag.classList.add('activo');

    paso1.classList.add('oculto');
    paso2.classList.remove('oculto');
    $('#equipos')?.focus();
  }

  function irAPaso1() {
    paso2.classList.add('oculto');
    paso1.classList.remove('oculto');
    paso2Tag.classList.remove('activo');
    paso1Tag.classList.add('activo');
    usuarioMini.classList.add('oculto');
    inputNombre?.focus();
  }

  const KEY_IDENTIDAD = 'alquipc_identidad';
  function guardarIdentidad(datos){
    try { localStorage.setItem(KEY_IDENTIDAD, JSON.stringify(datos)); } catch {}
  }
  function cargarIdentidad(){
    try { return JSON.parse(localStorage.getItem(KEY_IDENTIDAD) || 'null'); } catch { return null; }
  }

  const identidadGuardada = cargarIdentidad();
  if (identidadGuardada && identidadGuardada.nombre && identidadGuardada.email) {
    inputNombre.value = identidadGuardada.nombre;
    inputTelefono.value = identidadGuardada.telefono || '';
    inputEmail.value = identidadGuardada.email;
    irAPaso2(identidadGuardada);
  }

  formIdentidad.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = validarTexto(inputNombre, 3);
    const telefono = validarTelefono(inputTelefono);
    const email = validarEmail(inputEmail);
    if ([nombre, telefono, email].some(v => v === null)) return;

    const datos = { nombre, telefono, email };
    guardarIdentidad(datos);
    irAPaso2(datos);
  });

  btnEditarIdentidad.addEventListener('click', irAPaso1);

  const form = $('#form-alquiler');
  const inputEquipos = $('#equipos');
  const inputDias = $('#dias');
  const inputDiasExtra = $('#dias-adicionales');
  const radiosOpcion = $$('input[name="opcion"]');

  const seccionResultado = $('#resultado');
  const idClienteRes = $('#id-cliente');
  const opcionRes = $('#opcion-elegida');
  const equiposRes = $('#equipos-res');
  const diasRes = $('#dias-res');
  const diasExtraRes = $('#dias-extra-res');
  const clienteRes = $('#cliente-res');
  const telRes = $('#tel-res');
  const mailRes = $('#mail-res');
  const listaDetalle = $('#lista-detalle');
  const totalRes = $('#total-res');
  const btnLimpiar = $('#btn-limpiar');

  function calcular() {
    const ident = cargarIdentidad();
    if (!ident) { irAPaso1(); return; }

    const equipos = validarCampoNumero(inputEquipos, 2, 'el número de equipos');
    const dias = validarCampoNumero(inputDias, 1, 'los días iniciales');
    const diasExtra = validarCampoNumero(inputDiasExtra, 0, 'los días adicionales');
    if ([equipos, dias, diasExtra].some(v => v === null)) {
      seccionResultado.classList.add('oculto');
      return;
    }

    const opcion = opcionSeleccionada(radiosOpcion);

    const subtotalInicial = equipos * dias * PRECIO_BASE;
    const valorAdicionalBruto = equipos * diasExtra * PRECIO_BASE;
    const porcDescTotalExtra = PORC_DESC_DIA_ADICIONAL * diasExtra;
    const descuentoDiasExtra = valorAdicionalBruto * porcDescTotalExtra;
    const valorAdicionalNeto = valorAdicionalBruto - descuentoDiasExtra;

    const baseAjuste = subtotalInicial + valorAdicionalNeto;
    let recargoFuera = 0;
    let descuentoEstablecimiento = 0;
    if (opcion === 'fuera') {
      recargoFuera = baseAjuste * PORC_RECARGO_FUERA;
    } else if (opcion === 'establecimiento') {
      descuentoEstablecimiento = baseAjuste * PORC_DESC_ESTABLECIMIENTO;
    }
    const total = baseAjuste + recargoFuera - descuentoEstablecimiento;

    idClienteRes.textContent = generarIdCliente();
    opcionRes.textContent = opcion === 'ciudad' ? 'Dentro de la ciudad' : (opcion === 'fuera' ? 'Fuera de la ciudad' : 'Dentro del establecimiento');
    equiposRes.textContent = String(equipos);
    diasRes.textContent = String(dias);
    diasExtraRes.textContent = String(diasExtra);
    clienteRes.textContent = ident.nombre;
    telRes.textContent = ident.telefono;
    mailRes.textContent = ident.email;

    listaDetalle.innerHTML = '';
    const items = [
      ['Subtotal (equipos x días iniciales)', subtotalInicial],
      ['Valor días adicionales (antes de descuento)', valorAdicionalBruto],
      [`Descuento por días adicionales (${(porcDescTotalExtra*100).toFixed(0)}%)`, -descuentoDiasExtra],
      ['Subtotal con días adicionales', valorAdicionalNeto + subtotalInicial],
      ...(opcion === 'fuera' ? [['Recargo por fuera de la ciudad (5%)', recargoFuera]] : []),
      ...(opcion === 'establecimiento' ? [['Descuento por establecimiento (5%)', -descuentoEstablecimiento]] : []),
    ];

    for (const [t, v] of items) {
      const li = document.createElement('li');
      const sp1 = document.createElement('span'); sp1.textContent = t;
      const sp2 = document.createElement('strong'); sp2.textContent = (v < 0 ? '-' : '') + fmt.format(Math.abs(v));
      li.append(sp1, sp2);
      listaDetalle.appendChild(li);
    }

    totalRes.textContent = fmt.format(total);
    seccionResultado.classList.remove('oculto');
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    calcular();
  });

  btnLimpiar.addEventListener('click', () => {
    form.reset();
    $$('.error').forEach(e => e.textContent = '');
    seccionResultado.classList.add('oculto');
    inputEquipos.focus();
  });
})();
