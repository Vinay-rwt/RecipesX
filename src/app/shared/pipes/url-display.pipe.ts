import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'urlDisplay', standalone: false })
export class UrlDisplayPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url) return '';
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
}
