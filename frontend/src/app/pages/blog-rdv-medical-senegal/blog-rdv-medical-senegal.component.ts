import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-blog-rdv-medical-senegal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-rdv-medical-senegal.component.html',
  styleUrl: './blog-rdv-medical-senegal.component.css'
})
export class BlogRdvMedicalSenegalComponent implements OnInit {
  constructor(
    private title: Title,
    private meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Comment prendre rendez-vous médical en ligne au Sénégal | AlloDocteur');

    this.meta.updateTag({
      name: 'description',
      content: 'Découvrez comment prendre rendez-vous médical en ligne au Sénégal, choisir le bon praticien et réserver facilement votre consultation sur AlloDocteur.'
    });
  }
}