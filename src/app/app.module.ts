import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from 'src/firebase-config';

import { AppRoutingModule } from './app-routing.module';
import {
  DropdownModule,
  FileUploaderModule,
  ModalModule,
} from 'carbon-components-angular';
import { ButtonModule } from 'carbon-components-angular';
import { TilesModule } from 'carbon-components-angular';

import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';

@NgModule({
  declarations: [AppComponent, MapComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    FileUploaderModule,
    ButtonModule,
    TilesModule,
    ModalModule,
    DropdownModule,
    TilesModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
