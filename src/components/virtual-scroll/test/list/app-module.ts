import { Component, NgModule } from '@angular/core';
import { IonicApp, IonicModule } from '../../../..';


@Component({
  templateUrl: 'main.html'
})
export class E2EPage {
  items: Array<{id: number, url: string}>;
  imgDomain = 'http://localhost:8900';
  responseDelay = 2000;

  constructor() {
    // take a look at the gulp task: test.imageserver
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `${this.imgDomain}/reset`, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        this.fillList();
      }
    };
    xhr.send();
  }

  fillList() {
    this.items = [];
    for (let i = 0; i < 500; i++) {
      this.items.push({
        id: i,
        url: `${this.imgDomain}/?d=${this.responseDelay}&id=${i}`
      });
    }
  }

  emptyList() {
    this.items = [];
  }

  itemTapped(ev: any, item: {title: string, date: string}) {
    console.log(`itemTapped: ${item.title}`);
  }

  reload() {
    window.location.reload(true);
  }

}


@Component({
  template: '<ion-nav [root]="root"></ion-nav>'
})
export class E2EApp {
  root = E2EPage;
}


@NgModule({
  declarations: [
    E2EApp,
    E2EPage
  ],
  imports: [
    IonicModule.forRoot(E2EApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    E2EApp,
    E2EPage
  ]
})
export class AppModule {}
