import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSelectorComponent } from './list-selector.component';

describe('ListSelectorComponent', () => {
  let component: ListSelectorComponent;
  let fixture: ComponentFixture<ListSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
