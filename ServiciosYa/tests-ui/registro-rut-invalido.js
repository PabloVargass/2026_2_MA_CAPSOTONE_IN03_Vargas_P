const { remote } = require('webdriverio');

const PACKAGE_APP =
  'com.pablovargas.capstoneservicios';

async function ejecutarPrueba() {
  let driver;

  console.log('========================================');
  console.log('SERVICIOSYA - TEST RUT INVÁLIDO');
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

        'appium:automationName':
          'UiAutomator2',

        'appium:deviceName':
          'emulator-5554',

        'appium:udid':
          'emulator-5554',

        'appium:appPackage':
          PACKAGE_APP,

        'appium:appActivity':
          '.MainActivity',

        'appium:noReset':
          true,

        'appium:newCommandTimeout':
          120,
      },
    });

    console.log('✅ Appium conectado.');

    // =====================================
    // 2. ABRIR SERVICIOSYA
    // =====================================

    console.log('');
    console.log('📱 Abriendo ServiciosYa...');

    await driver.activateApp(
      PACKAGE_APP,
    );

    await driver.pause(1500);

    const activity =
      await driver.getCurrentActivity();

    if (!activity.includes('MainActivity')) {
      throw new Error(
        `ServiciosYa no está activa. Activity encontrada: ${activity}`,
      );
    }

    console.log('✅ ServiciosYa está activa.');

    // =====================================
    // 3. VOLVER A LA PANTALLA PRINCIPAL
    // =====================================

    console.log('');
    console.log(
      '🏠 Preparando pantalla inicial...',
    );

    // Como usamos noReset, la aplicación podría
    // haber quedado en la pantalla de registro.
    // Buscamos primero el botón Crear cuenta.

    let botonCrearCuenta =
      await driver.$(
        'android=new UiSelector().text("Crear cuenta")',
      );

    const estaVisible =
      await botonCrearCuenta.isDisplayed()
        .catch(() => false);

    if (estaVisible) {
      console.log(
        '🔎 Se encontró "Crear cuenta".',
      );

      // Puede ser el botón de Home o el botón
      // del propio formulario.
      // Intentaremos localizar el campo Nombre.
    }

    const campoNombreExistente =
      await driver.$(
        'android=new UiSelector().text("Nombre completo")',
      );

    const estamosEnRegistro =
      await campoNombreExistente.isDisplayed()
        .catch(() => false);

    if (!estamosEnRegistro) {
      console.log(
        '👆 Entrando a Crear cuenta...',
      );

      botonCrearCuenta =
        await driver.$(
          'android=new UiSelector().text("Crear cuenta")',
        );

      await botonCrearCuenta.waitForDisplayed({
        timeout: 10000,
      });

      await botonCrearCuenta.click();

      await driver.pause(1500);
    } else {
      console.log(
        '✅ Ya estamos en la pantalla de registro.',
      );
    }

    // =====================================
    // 4. LOCALIZAR LOS CAMPOS
    // =====================================

    console.log('');
    console.log(
      '🔎 Buscando campos del formulario...',
    );

    const campoNombre =
      await driver.$(
        'android=new UiSelector().text("Nombre completo")',
      );

    const campoRut =
      await driver.$(
        'android=new UiSelector().text("RUT (ej: 12345678-5)")',
      );

    const campoCorreo =
      await driver.$(
        'android=new UiSelector().text("Correo electrónico")',
      );

    const campoTelefono =
      await driver.$(
        'android=new UiSelector().text("Teléfono")',
      );

    const campoContrasena =
      await driver.$(
        'android=new UiSelector().text("Contraseña")',
      );

    const campoConfirmarContrasena =
      await driver.$(
        'android=new UiSelector().text("Confirmar contraseña")',
      );

    await campoNombre.waitForDisplayed({
      timeout: 10000,
    });

    await campoRut.waitForDisplayed({
      timeout: 10000,
    });

    await campoCorreo.waitForDisplayed({
      timeout: 10000,
    });

    await campoTelefono.waitForDisplayed({
      timeout: 10000,
    });

    await campoContrasena.waitForDisplayed({
      timeout: 10000,
    });

    await campoConfirmarContrasena.waitForDisplayed({
      timeout: 10000,
    });

    console.log(
      '✅ Todos los campos fueron encontrados.',
    );

    // =====================================
    // 5. COMPLETAR NOMBRE
    // =====================================

    console.log('');
    console.log(
      '⌨️ Escribiendo nombre...',
    );

    await campoNombre.click();

    await campoNombre.setValue(
      'Usuario Prueba',
    );

    await driver.pause(700);

    // =====================================
    // 6. ESCRIBIR RUT INVÁLIDO
    // =====================================

    console.log(
      '⌨️ Escribiendo RUT inválido...',
    );

    await campoRut.click();

    await campoRut.setValue(
      '12345678-0',
    );

    await driver.pause(700);

    // =====================================
    // 7. COMPLETAR CORREO
    // =====================================

    console.log(
      '⌨️ Escribiendo correo...',
    );

    await campoCorreo.click();

    await campoCorreo.setValue(
      'prueba.appium@serviciosya.cl',
    );

    await driver.pause(700);

    // =====================================
    // 8. COMPLETAR TELÉFONO
    // =====================================

    console.log(
      '⌨️ Escribiendo teléfono...',
    );

    await campoTelefono.click();

    await campoTelefono.setValue(
      '912345678',
    );

    await driver.pause(700);

    // =====================================
    // 9. COMPLETAR CONTRASEÑA
    // =====================================

    console.log(
      '⌨️ Escribiendo contraseña...',
    );

    await campoContrasena.click();

    await campoContrasena.setValue(
      'Prueba123',
    );

    await driver.pause(700);

    // =====================================
    // 10. CONFIRMAR CONTRASEÑA
    // =====================================

    console.log(
      '⌨️ Confirmando contraseña...',
    );

    await campoConfirmarContrasena.click();

    await campoConfirmarContrasena.setValue(
      'Prueba123',
    );

    await driver.pause(1000);

    // =====================================
    // 11. OCULTAR TECLADO
    // =====================================

    console.log('');
    console.log(
      '⌨️ Ocultando teclado...',
    );

    try {
      await driver.hideKeyboard();
    } catch {
      // Si ya estaba oculto, continuamos.
    }

    await driver.pause(1000);

    // =====================================
    // 12. BUSCAR BOTÓN CREAR CUENTA
    // =====================================

    console.log('');
    console.log(
      '🔎 Buscando botón final "Crear cuenta"...',
    );

    const botonesCrearCuenta =
      await driver.$$(
        'android=new UiSelector().text("Crear cuenta")',
      );

    if (botonesCrearCuenta.length === 0) {
      throw new Error(
        'No se encontró el botón Crear cuenta.',
      );
    }

    const botonFinal =
      botonesCrearCuenta[
        botonesCrearCuenta.length - 1
      ];

    await botonFinal.waitForDisplayed({
      timeout: 10000,
    });

    // =====================================
    // 13. ENVIAR FORMULARIO
    // =====================================

    console.log('');
    console.log(
      '👆 Presionando Crear cuenta...',
    );

    await botonFinal.click();

    await driver.pause(2000);

    // =====================================
    // 14. BUSCAR ERROR DEL RUT
    // =====================================

    console.log('');
    console.log(
      '🔎 Buscando mensaje de RUT inválido...',
    );

    const mensajeRut =
      await driver.$(
        'android=new UiSelector().textContains("RUT")',
      );

    await mensajeRut.waitForDisplayed({
      timeout: 10000,
    });

    const textoError =
      await mensajeRut.getText();

    console.log('');
    console.log(
      'Mensaje encontrado:',
      textoError,
    );

    // =====================================
    // 15. VALIDAR RESULTADO
    // =====================================

    if (
      !textoError
        .toUpperCase()
        .includes('RUT')
    ) {
      throw new Error(
        `No se encontró un error relacionado con el RUT. Texto encontrado: ${textoError}`,
      );
    }

    console.log('');
    console.log(
      '✅ La aplicación rechazó el RUT inválido.',
    );

    // =====================================
    // 16. DEJAR RESULTADO VISIBLE
    // =====================================

    console.log('');
    console.log(
      '👀 Dejando el resultado visible 5 segundos...',
    );

    await driver.pause(5000);

    // =====================================
    // RESULTADO FINAL
    // =====================================

    console.log('');
    console.log('========================================');
    console.log('✅ TEST RUT INVÁLIDO SUPERADO');
    console.log('========================================');

    console.log('');
    console.log(
      'ServiciosYa detectó correctamente un RUT inválido.',
    );
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ TEST RUT INVÁLIDO FALLIDO');
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