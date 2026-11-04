import { smtpOptions } from './mail.service';

describe('Configuración SMTP', () => {
  it('sin SMTP_HOST mantiene Gmail', () => {
    expect(smtpOptions({}, 'remitente@gmail.com', 'clave')).toEqual({
      service: 'gmail',
      auth: { user: 'remitente@gmail.com', pass: 'clave' },
    });
  });

  it('con SMTP_HOST usa ese servidor, su puerto y el usuario SMTP', () => {
    expect(
      smtpOptions(
        {
          SMTP_HOST: 'smtp-relay.brevo.com',
          SMTP_PORT: '2525',
          SMTP_USER: 'acceso@smtp-brevo.com',
        },
        'remitente@gmail.com',
        'clave',
      ),
    ).toEqual({
      host: 'smtp-relay.brevo.com',
      port: 2525,
      secure: false,
      auth: { user: 'acceso@smtp-brevo.com', pass: 'clave' },
    });
  });

  it('el puerto 465 usa conexión segura y sin SMTP_USER autentica con EMAIL_USER', () => {
    expect(
      smtpOptions(
        { SMTP_HOST: 'smtp.ejemplo.test', SMTP_PORT: '465' },
        'remitente@gmail.com',
        'clave',
      ),
    ).toMatchObject({
      port: 465,
      secure: true,
      auth: { user: 'remitente@gmail.com' },
    });
  });
});
