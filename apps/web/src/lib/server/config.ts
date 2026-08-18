import { env } from '$env/dynamic/private';
import { readWebConfiguration, type WebConfiguration } from '@podgauge/config';

let configuration: WebConfiguration | undefined;

export function getWebConfiguration(): WebConfiguration {
  configuration ??= readWebConfiguration(env);
  return configuration;
}
