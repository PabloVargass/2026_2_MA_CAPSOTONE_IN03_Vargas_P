const { remote } = require('webdriverio');

async function ejecutarPrueba() {
  let driver;

  console.log('====================================');
  console.log('SERVICIOSYA - TEST CREAR CUENTA');
  console.log('====================================');

  try {
    // =====================================
    // CONECTAR CON APPIUM
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
          'com.pablovargas.capstoneservicios',

        'appium:appActivity':
          '.MainActivity',

        'appium:noReset':
          true,

        'appium:newCommandTimeout':
          120,
      },
    });

    console.log('');
    console.log('✅ Appium conectado.');

    // =====================================
    // ABRIR SERVICIOSYA
    // =====================================

    console.log('');
    console.log('📱 Abriendo ServiciosYa...');

    await driver.activateApp(
      'com.pablovargas.capstoneservicios',
    );

    await driver.pause(2000);

    // =====================================
    // COMPROBAR ACTIVITY
    // =====================================

    const activity =
      await driver.getCurrentActivity();

    console.log('');
    console.log(
      'Activity actual:',
      activity,
    );

    if (!activity.includes('MainActivity')) {
      throw new Error(
        `ServiciosYa no está activa. Activity: ${activity}`,
      );
    }

    console.log(
      '✅ ServiciosYa está en primer plano.',
    );

    // =====================================
    // BUSCAR BOTÓN CREAR CUENTA
    // =====================================

    console.log('');
    console.log(
      '🔎 Buscando botón "Crear cuenta"...',
    );

    const botonCrearCuenta =
      await driver.$(
        'android=new UiSelector().text("Crear cuenta")',
      );

    await botonCrearCuenta.waitForDisplayed({
      timeout: 10000,
    });

    console.log(
      '✅ Botón "Crear cuenta" encontrado.',
    );

    // =====================================
    // PRESIONAR BOTÓN
    // =====================================

    console.log('');
    console.log(
      '👆 Presionando "Crear cuenta"...',
    );

    await botonCrearCuenta.click();

    await driver.pause(2000);

    // =====================================
    // COMPROBAR PANTALLA DE REGISTRO
    // =====================================

    console.log('');
    console.log(
      '🔎 Comprobando pantalla de registro...',
    );

    const textoCrearCuenta =
      await driver.$(
        'android=new UiSelector().text("Crear cuenta")',
      );

    await textoCrearCuenta.waitForDisplayed({
      timeout: 10000,
    });

    console.log('');
    console.log(
      '✅ Pantalla de registro encontrada.',
    );

    // =====================================
    // DEJAR PANTALLA VISIBLE
    // =====================================

    console.log('');
    console.log(
      '👀 Dejando el registro visible 5 segundos...',
    );

    await driver.pause(5000);

    // =====================================
    // RESULTADO
    // =====================================

    console.log('');
    console.log('====================================');
    console.log('✅ TEST COMPLETADO CORRECTAMENTE');
    console.log('====================================');
    console.log('');
    console.log(
      'Appium abrió ServiciosYa y entró al registro.',
    );
  } catch (error) {
    console.error('');
    console.error('====================================');
    console.error('❌ TEST FALLIDO');
    console.error('====================================');

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  } finally {
    // =====================================
    // CERRAR SESIÓN
    // =====================================

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