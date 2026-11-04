const { remote } = require('webdriverio');

const PACKAGE_APP = 'com.pablovargas.capstoneservicios';

async function ejecutarPrueba() {
  let driver;

  console.log('========================================');
  console.log('SERVICIOSYA - TEST CONTRASEÑA INVÁLIDA');
  console.log('========================================');

  try {
    // =====================================
    // 1. CONECTAR CON APPIUM
    // =====================================

    console.log('');
    console.log('🤖 Conectando con Appium...');

    driver = await remote({
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',

      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'emulator-5554',
        'appium:udid': 'emulator-5554',
        'appium:appPackage': PACKAGE_APP,
        'appium:appActivity': '.MainActivity',
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
    });

    console.log('✅ Appium conectado.');

    // =====================================
    // 2. ABRIR SERVICIOSYA
    // =====================================

    console.log('');
    console.log('📱 Abriendo ServiciosYa...');

    await driver.activateApp(PACKAGE_APP);
    await driver.pause(1500);

    const activity = await driver.getCurrentActivity();

    if (!activity.includes('MainActivity')) {
      throw new Error(
        `ServiciosYa no está activa. Activity encontrada: ${activity}`,
      );
    }

    console.log('✅ ServiciosYa está activa.');

    // =====================================
    // 3. IR A REGISTRO
    // =====================================

    console.log('');
    console.log('🏠 Preparando pantalla de registro...');

    const campoNombreInicial = await driver.$(
      'android=new UiSelector().text("Nombre completo")',
    );

    const estamosEnRegistro = await campoNombreInicial
      .isDisplayed()
      .catch(() => false);

    if (!estamosEnRegistro) {
      console.log('👆 Entrando a Crear cuenta...');

      const botonCrearCuentaInicio = await driver.$(
        'android=new UiSelector().text("Crear cuenta")',
      );

      await botonCrearCuentaInicio.waitForDisplayed({
        timeout: 10000,
      });

      await botonCrearCuentaInicio.click();
      await driver.pause(1500);
    } else {
      console.log('✅ Ya estamos en la pantalla de registro.');
    }

    // =====================================
    // 4. BUSCAR CAMPOS
    // =====================================

    console.log('');
    console.log('🔎 Buscando campos del formulario...');

    const campoNombre = await driver.$(
      'android=new UiSelector().text("Nombre completo")',
    );

    const campoRut = await driver.$(
      'android=new UiSelector().text("RUT (ej: 12345678-5)")',
    );

    const campoCorreo = await driver.$(
      'android=new UiSelector().text("Correo electrónico")',
    );

    const campoTelefono = await driver.$(
      'android=new UiSelector().text("Teléfono")',
    );

    const campoContrasena = await driver.$(
      'android=new UiSelector().text("Contraseña")',
    );

    const campoConfirmarContrasena = await driver.$(
      'android=new UiSelector().text("Confirmar contraseña")',
    );

    await campoNombre.waitForDisplayed({ timeout: 10000 });
    await campoRut.waitForDisplayed({ timeout: 10000 });
    await campoCorreo.waitForDisplayed({ timeout: 10000 });
    await campoTelefono.waitForDisplayed({ timeout: 10000 });
    await campoContrasena.waitForDisplayed({ timeout: 10000 });
    await campoConfirmarContrasena.waitForDisplayed({
      timeout: 10000,
    });

    console.log('✅ Todos los campos fueron encontrados.');

    // =====================================
    // 5. COMPLETAR FORMULARIO
    // =====================================

    console.log('');
    console.log('📝 Completando formulario...');

    console.log('   Nombre: Usuario Prueba ✅');
    await campoNombre.click();
    await campoNombre.setValue('Usuario Prueba');
    await driver.pause(500);

    console.log('   RUT: 12345678-5 ✅');
    await campoRut.click();
    await campoRut.setValue('12345678-5');
    await driver.pause(500);

    console.log('   Correo: prueba.password@gmail.com ✅');
    await campoCorreo.click();
    await campoCorreo.setValue(
      'prueba.password@gmail.com',
    );
    await driver.pause(500);

    console.log('   Teléfono: 912345678 ✅');
    await campoTelefono.click();
    await campoTelefono.setValue('912345678');
    await driver.pause(500);

    // =====================================
    // CONTRASEÑA INVÁLIDA
    // =====================================

    console.log('   Contraseña: 123 ❌');

    await campoContrasena.click();
    await campoContrasena.setValue('123');

    await driver.pause(500);

    console.log('   Confirmación: 123 ✅');

    await campoConfirmarContrasena.click();
    await campoConfirmarContrasena.setValue('123');

    await driver.pause(1000);

    // =====================================
    // 6. OCULTAR TECLADO
    // =====================================

    console.log('');
    console.log('⌨️ Ocultando teclado...');

    try {
      await driver.hideKeyboard();
    } catch {
      // Si ya está oculto, continuamos.
    }

    await driver.pause(700);

    // =====================================
    // 7. PRESIONAR CREAR CUENTA
    // =====================================

    console.log('');
    console.log('👆 Presionando Crear cuenta...');

    const botonesCrearCuenta = await driver.$$(
      'android=new UiSelector().text("Crear cuenta")',
    );

    if (botonesCrearCuenta.length === 0) {
      throw new Error(
        'No se encontró el botón Crear cuenta.',
      );
    }

    const botonCrearCuenta =
      botonesCrearCuenta[botonesCrearCuenta.length - 1];

    await botonCrearCuenta.waitForDisplayed({
      timeout: 10000,
    });

    await botonCrearCuenta.click();

    await driver.pause(1500);

    // =====================================
    // 8. VALIDAR MENSAJE EXACTO
    // =====================================

    console.log('');
    console.log(
      '🔎 Buscando mensaje exacto de contraseña...',
    );

    const MENSAJE_ESPERADO =
      'La contraseña debe tener al menos 6 caracteres.';

    const mensajeError = await driver.$(
      `android=new UiSelector().text("${MENSAJE_ESPERADO}")`,
    );

    await mensajeError.waitForDisplayed({
      timeout: 10000,
    });

    const textoEncontrado =
      await mensajeError.getText();

    console.log('');
    console.log(`Esperado : ${MENSAJE_ESPERADO}`);
    console.log(`Encontrado: ${textoEncontrado}`);

    // =====================================
    // 9. COMPARAR RESULTADO
    // =====================================

    if (textoEncontrado !== MENSAJE_ESPERADO) {
      throw new Error(
        `Mensaje incorrecto. Se esperaba "${MENSAJE_ESPERADO}" pero apareció "${textoEncontrado}".`,
      );
    }

    console.log('');
    console.log(
      '✅ Contraseña inválida detectada correctamente.',
    );

    console.log(
      '✅ El mensaje mostrado coincide exactamente.',
    );

    console.log(
      '✅ Los demás datos utilizados son válidos.',
    );

    // =====================================
    // 10. EVIDENCIA VISUAL
    // =====================================

    console.log('');
    console.log(
      '👀 Dejando evidencia visible 5 segundos...',
    );

    await driver.pause(5000);

    // =====================================
    // RESULTADO FINAL
    // =====================================

    console.log('');
    console.log('========================================');
    console.log('✅ TEST CONTRASEÑA INVÁLIDA SUPERADO');
    console.log('========================================');
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ TEST CONTRASEÑA INVÁLIDA FALLIDO');
    console.error('========================================');

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  } finally {
    if (driver) {
      console.log('');
      console.log(
        '🔌 Cerrando sesión de Appium...',
      );

      await driver.deleteSession();
    }
  }
}

ejecutarPrueba();