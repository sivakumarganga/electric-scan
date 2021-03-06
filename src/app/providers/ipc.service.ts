/*
  Electric Scan
  Copyright (C) 2019  Bishop Fox

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU General Public License
  as published by the Free Software Foundation; either version 2
  of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
--------------------------------------------------------------------------

This service is the common carrier for all IPC messages.

*/

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


interface IPCMessage {
  id: number;
  type: string;
  method: string;
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class IPCService {

  private _ipcResponse$ = new Subject<IPCMessage>();
  ipcPush$ = new Subject<Object>();

  constructor() {
    window.addEventListener('message', (ipcEvent) => {
      try {
        const msg: IPCMessage = JSON.parse(ipcEvent.data);
        if (msg.type === 'response') {
          this._ipcResponse$.next(msg);
        } else if (msg.type === 'push') {
          this.ipcPush$.next(JSON.parse(msg.data));
        }
      } catch (err) {
        console.error(`[IPCService] ${err}`);
      }
    });
  }

  request(method: string, data?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const msgId = this.randomId();
      const subscription = this._ipcResponse$.subscribe((msg: IPCMessage) => {
        if (msg.id === msgId) {
          console.log(`[IPCService] IPC Response with ID ${msgId}`);
          subscription.unsubscribe();
          if (msg.method !== 'error') {
            resolve(msg.data);
          } else {
            reject(msg.data);
          }
        }
      });
      console.log(`[IPCService] IPC Request with ID ${msgId}`);
      window.postMessage(JSON.stringify({
        id: msgId,
        type: 'request',
        method: method,
        data: data,
      }), '*');
    });
  }

  private randomId(): number {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    const bufView = new DataView(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    return bufView.getUint32(0, true) || 1; // In the unlikely event we get a 0 value, return 1 instead
  }

}
