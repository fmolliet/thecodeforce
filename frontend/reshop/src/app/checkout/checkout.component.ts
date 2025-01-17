import { Component, OnInit } from '@angular/core';
import {MockService} from "../mock.service";
import {ActivatedRoute, Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {

  constructor(private mockService:MockService, private router:Router, private route:ActivatedRoute, private http:HttpClient) { }

  activeUser: any;
  productToSearch = "";
  searchList:any[] = []

  ngOnInit(): void {
    this.mockService.getActiveUser(this.route.snapshot.params['id']).subscribe((user) => {
      this.activeUser = user;
    })
  }

  increaseAmount(p: any) {
    p.amount++;
    this.updateNextPurchase();
  }

  decreaseAmount(p: any) {
    if(p.amount == 1){
      if(confirm("Deseja remove este item da sua cesta?")){
        let index = this.activeUser.list.products.findIndex((p2:any) => p2.product == p.product);
        this.activeUser.list.products.splice(index, 1);
      }
    }else{
      p.amount--;
    }
    this.updateNextPurchase();
  }

  addDays(date: Date, days:number) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  updateNextPurchase(){

    let totalDays: any[] = [];

    if(!this.activeUser.lastPurchase){
      this.activeUser.list.products.forEach((p:any) => {
        totalDays.push(p.amount * p.product.avgDuration);
      });

      const sum = totalDays.reduce((a, b) => a + b, 0);
      const avg = (sum / totalDays.length) || 0;

      this.activeUser.periodicity = avg;

      let d = new Date();
      d = this.addDays(d, avg);

      //this.nextPurchase = [d.getFullYear(), (d.getMonth()+1).toString().padStart(2, "0"), d.getDate().toString().padStart(2, "0")].join("-");

      this.http.patch("https://codeforce-shopping.herokuapp.com/list", this.activeUser.list).subscribe((res) => {
        console.log(res);
      });
    }
  }

  addProduct(product: any) {
    this.productToSearch = "";
    this.activeUser.list.products.push({
      product: product,
      amount: 1
    });

    this.updateNextPurchase();
  }

  onSearchChange() {

    if(this.productToSearch.length <= 2){
      this.searchList = []
    }else{
      // @ts-ignore
      this.searchList = this.mockService.search(this.productToSearch);
    }

  }

  getTotal() {
    let total = 0;
    this.activeUser.list.products.forEach((p:any) => {
      total += p.product.price * p.amount;
    });
    return total;
  }

  getDescTotal() {
    let total = 0;
    this.activeUser.list.products.forEach((p:any) => {
      total += p.product.price * p.amount;
    });
    return total - total * .15;
  }

  payNow() {
    if(confirm("Confirma a operação?")){

      let d = new Date();
      let strD = [d.getFullYear(), (d.getMonth()+1).toString().padStart(2, "0"), d.getDate().toString().padStart(2, "0")].join("-");



      this.http.post("https://codeforce-order.herokuapp.com/order",{
        "amount" : this.getDescTotal(),
        "idClient" : this.activeUser.documentNumber,
        "status" : "Enviado para análise",
        "dateStart" : strD,
        "products" : this.activeUser.list.products
      }, ).subscribe((r: any) => {
        console.log(r.id)

        this.http.post("https://codeforce-pay-bff.herokuapp.com/card/pay",{
          orderId: r.id,
          clientId: this.activeUser.documentNumber,
        }).subscribe((r: any) => {
          this.router.navigate(['checkout-complete', this.activeUser.documentNumber]);
        });
      });

    }
  }
}
