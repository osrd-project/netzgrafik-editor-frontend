import {Injectable} from "@angular/core";
import {MathUtils} from "../../utils/math";
import {LeftAndRightElement, TrainrunsectionHelper,} from "../util/trainrunsection.helper";
import {
  LeftAndRightLockStructure,
  LeftAndRightTimeStructure,
} from "../../view/dialogs/trainrun-and-section-dialog/trainrunsection-tab/trainrun-section-tab.component";
import {TrainrunService} from "./trainrun.service";
import {TrainrunSectionService} from "./trainrunsection.service";
import {FilterService} from "../ui/filter.service";
import {TrainrunSection} from "../../models/trainrunsection.model";
import {Node} from "../../models/node.model";
import {LoadPerlenketteService} from "../../perlenkette/service/load-perlenkette.service";

@Injectable({
  providedIn: "root",
})
export class TrainrunSectionTimesService {
  private trainrunSectionHelper: TrainrunsectionHelper;
  private selectedTrainrunSection: TrainrunSection;

  private timeStructure: LeftAndRightTimeStructure;
  private originalTimeStructure: LeftAndRightTimeStructure = {
    leftDepartureTime: 0,
    leftArrivalTime: 0,
    rightDepartureTime: 0,
    rightArrivalTime: 0,
    travelTime: 0,
  };

  private nodesOrdered: Node[] = [];

  private lockStructure: LeftAndRightLockStructure = {
    leftLock: false,
    rightLock: false,
    travelTimeLock: false,
  };
  private showWarningTwoLocks = false;
  private onLockButtonClicked = false;

  private offset: number;
  private offsetTransformationActive = false;

  private highlightTravelTimeElement: boolean;

  private initialLeftAndRightElement: LeftAndRightElement =
    LeftAndRightElement.LeftArrival;

  constructor(
    private trainrunService: TrainrunService,
    private trainrunSectionService: TrainrunSectionService,
    private filterService: FilterService,
    private loadPerlenketteService: LoadPerlenketteService,
  ) {
    this.trainrunSectionHelper = new TrainrunsectionHelper(
      this.trainrunService,
    );
  }

  public setTrainrunSection(trainrunSection: TrainrunSection) {
    this.selectedTrainrunSection = trainrunSection;
    this.originalTimeStructure =
      this.trainrunSectionHelper.getLeftAndRightTimes(
        this.selectedTrainrunSection,
        this.nodesOrdered,
      );
    this.timeStructure = Object.assign({}, this.originalTimeStructure);
  }

  public getTimeStructure(): LeftAndRightTimeStructure {
    return this.timeStructure;
  }

  public getOffsetTransformationActive(): boolean {
    return this.offsetTransformationActive;
  }

  public getShowWarningTwoLocks(): boolean {
    return this.showWarningTwoLocks;
  }

  public getNodesOrdered(): Node[] {
    return this.nodesOrdered;
  }

  public setNodesOrdered(nodesOrdered: Node[]) {
    this.nodesOrdered = nodesOrdered;
  }

  public getLockStructure(): LeftAndRightLockStructure {
    return this.lockStructure;
  }

  public setLockStructure(lockStructure: LeftAndRightLockStructure) {
    this.lockStructure = lockStructure;
  }

  public getOffset(): number {
    return this.offset;
  }

  public setOffset(offset: number) {
    this.offset = offset;
  }

  public getHighlightTravelTimeElement() {
    return this.highlightTravelTimeElement;
  }

  public setHighlightTravelTimeElement(highlightTravelTimeElement: boolean) {
    this.highlightTravelTimeElement = highlightTravelTimeElement;
  }

  public setInitialLeftAndRightElement(
    initialLeftAndRightElement: LeftAndRightElement,
  ) {
    this.initialLeftAndRightElement = initialLeftAndRightElement;
  }

  private getTimeButtonPlusMinusStep(val: number) {
    return 1 - val + Math.floor(val);
  }

  /* Left Departure Time */
  onNodeLeftDepartureTimeButtonPlus() {
    this.timeStructure.leftDepartureTime += this.getTimeButtonPlusMinusStep(
      this.timeStructure.leftDepartureTime,
    );
    this.timeStructure.leftDepartureTime %= 60;
    this.onNodeLeftDepartureTimeChanged();
  }

  onNodeLeftDepartureTimeButtonMinus() {
    this.timeStructure.leftDepartureTime -= this.getTimeButtonPlusMinusStep(
      this.timeStructure.leftDepartureTime,
    );
    this.timeStructure.leftDepartureTime +=
      this.timeStructure.leftDepartureTime < 0 ? 60 : 0;
    this.onNodeLeftDepartureTimeChanged();
  }

  onNodeLeftDepartureTimeChanged() {
    this.showWarningTwoLocks = false;
    this.roundAllTimes();
    this.removeOffsetAndBackTransformTimeStructure();

    this.timeStructure.leftArrivalTime = TrainrunsectionHelper.getSymmetricTime(
      this.timeStructure.leftDepartureTime,
    );
    if (!this.lockStructure.rightLock) {
      this.timeStructure.rightArrivalTime =
        this.timeStructure.leftDepartureTime +
        (this.timeStructure.travelTime % 60);
      this.timeStructure.rightArrivalTime %= 60;
      this.timeStructure.rightDepartureTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.rightArrivalTime,
        );
    } else if (
      !this.lockStructure.travelTimeLock &&
      this.lockStructure.rightLock
    ) {
      const extraHour =
        this.timeStructure.travelTime - (this.timeStructure.travelTime % 60);
      this.timeStructure.travelTime =
        this.timeStructure.leftArrivalTime -
        this.timeStructure.rightDepartureTime;
      this.timeStructure.travelTime +=
        this.timeStructure.travelTime < 0 ? 60 : 0;
      this.timeStructure.travelTime += extraHour;
    } else {
      this.showWarningTwoLocks = true;
    }

    this.updateTrainrunSectionTime();
    this.applyOffsetAndTransformTimeStructure();
  }

  /* Left Arrival Time */
  onNodeLeftArrivalTimeButtonPlus() {
    this.timeStructure.leftArrivalTime += this.getTimeButtonPlusMinusStep(
      this.timeStructure.leftArrivalTime,
    );
    this.timeStructure.leftArrivalTime %= 60;
    this.onNodeLeftArrivalTimeChanged();
  }

  onNodeLeftArrivalTimeButtonMinus() {
    this.timeStructure.leftArrivalTime -= this.getTimeButtonPlusMinusStep(
      this.timeStructure.leftArrivalTime,
    );
    this.timeStructure.leftArrivalTime +=
      this.timeStructure.leftArrivalTime < 0 ? 60 : 0;
    this.onNodeLeftArrivalTimeChanged();
  }

  onNodeLeftArrivalTimeChanged() {
    this.showWarningTwoLocks = false;
    this.roundAllTimes();
    this.removeOffsetAndBackTransformTimeStructure();

    this.timeStructure.leftDepartureTime =
      TrainrunsectionHelper.getSymmetricTime(
        this.timeStructure.leftArrivalTime,
      );
    if (!this.lockStructure.rightLock) {
      this.timeStructure.rightDepartureTime =
        this.timeStructure.leftArrivalTime -
        (this.timeStructure.travelTime % 60);
      this.timeStructure.rightDepartureTime +=
        this.timeStructure.rightDepartureTime < 0 ? 60 : 0;
      this.timeStructure.rightArrivalTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.rightDepartureTime,
        );
    } else if (
      !this.lockStructure.travelTimeLock &&
      this.lockStructure.rightLock
    ) {
      const extraHour =
        this.timeStructure.travelTime - (this.timeStructure.travelTime % 60);
      this.timeStructure.travelTime =
        this.timeStructure.leftArrivalTime -
        this.timeStructure.rightDepartureTime;
      this.timeStructure.travelTime +=
        this.timeStructure.travelTime < 0 ? 60 : 0;
      this.timeStructure.travelTime += extraHour;
    } else {
      this.showWarningTwoLocks = true;
    }

    this.updateTrainrunSectionTime();
    this.applyOffsetAndTransformTimeStructure();
  }

  /* Right Arrival Time */
  onNodeRightArrivalTimeButtonPlus() {
    this.timeStructure.rightArrivalTime += this.getTimeButtonPlusMinusStep(
      this.timeStructure.rightArrivalTime,
    );
    this.timeStructure.rightArrivalTime %= 60;
    this.onNodeRightArrivalTimeChanged();
  }

  onNodeRightArrivalTimeButtonMinus() {
    this.timeStructure.rightArrivalTime -= this.getTimeButtonPlusMinusStep(
      this.timeStructure.rightArrivalTime,
    );
    this.timeStructure.rightArrivalTime +=
      this.timeStructure.rightArrivalTime < 0 ? 60 : 0;
    this.onNodeRightArrivalTimeChanged();
  }

  onNodeRightArrivalTimeChanged() {
    this.showWarningTwoLocks = false;
    this.roundAllTimes();
    this.removeOffsetAndBackTransformTimeStructure();
    this.timeStructure.rightDepartureTime =
      TrainrunsectionHelper.getSymmetricTime(
        this.timeStructure.rightArrivalTime,
      );

    if (!this.lockStructure.leftLock) {
      this.timeStructure.leftDepartureTime =
        this.timeStructure.rightArrivalTime -
        (this.timeStructure.travelTime % 60);
      this.timeStructure.leftDepartureTime +=
        this.timeStructure.leftDepartureTime < 0 ? 60 : 0;
      this.timeStructure.leftArrivalTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.leftDepartureTime,
        );
    } else if (
      !this.lockStructure.travelTimeLock &&
      this.lockStructure.leftLock
    ) {
      const extraHour =
        this.timeStructure.travelTime - (this.timeStructure.travelTime % 60);
      this.timeStructure.travelTime =
        this.timeStructure.rightArrivalTime -
        this.timeStructure.leftDepartureTime;
      this.timeStructure.travelTime +=
        this.timeStructure.travelTime < 0 ? 60 : 0;
      this.timeStructure.travelTime += extraHour;
    } else {
      this.showWarningTwoLocks = true;
    }

    this.updateTrainrunSectionTime();
    this.applyOffsetAndTransformTimeStructure();
  }

  /* Right Departure Time */
  onNodeRightDepartureTimeButtonPlus() {
    this.timeStructure.rightDepartureTime += this.getTimeButtonPlusMinusStep(
      this.timeStructure.rightDepartureTime,
    );
    this.timeStructure.rightDepartureTime %= 60;
    this.onNodeRightDepartureTimeChanged();
  }

  onNodeRightDepartureTimeButtonMinus() {
    this.timeStructure.rightDepartureTime -= this.getTimeButtonPlusMinusStep(
      this.timeStructure.rightDepartureTime,
    );
    this.timeStructure.rightDepartureTime +=
      this.timeStructure.rightDepartureTime < 0 ? 60 : 0;
    this.onNodeRightDepartureTimeChanged();
  }

  onNodeRightDepartureTimeChanged() {
    this.showWarningTwoLocks = false;
    this.roundAllTimes();
    this.removeOffsetAndBackTransformTimeStructure();

    this.timeStructure.rightArrivalTime =
      TrainrunsectionHelper.getSymmetricTime(
        this.timeStructure.rightDepartureTime,
      );
    if (!this.lockStructure.leftLock) {
      this.timeStructure.leftArrivalTime =
        this.timeStructure.rightDepartureTime +
        (this.timeStructure.travelTime % 60);
      this.timeStructure.leftArrivalTime %= 60;
      this.timeStructure.leftDepartureTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.leftArrivalTime,
        );
    } else if (
      !this.lockStructure.travelTimeLock &&
      this.lockStructure.leftLock
    ) {
      const extraHour =
        this.timeStructure.travelTime - (this.timeStructure.travelTime % 60);
      this.timeStructure.travelTime =
        this.timeStructure.rightArrivalTime -
        this.timeStructure.leftDepartureTime;
      this.timeStructure.travelTime +=
        this.timeStructure.travelTime < 0 ? 60 : 0;
      this.timeStructure.travelTime += extraHour;
    } else {
      this.showWarningTwoLocks = true;
    }

    this.updateTrainrunSectionTime();
    this.applyOffsetAndTransformTimeStructure();
  }

  /* Travel Time */
  onInputTravelTimeElementButtonPlus() {
    this.timeStructure.travelTime += this.getTimeButtonPlusMinusStep(
      this.timeStructure.travelTime,
    );
    this.highlightTravelTimeElement = false;
    this.onInputTravelTimeChanged();
  }

  onInputTravelTimeElementButtonMinus() {
    this.timeStructure.travelTime -= this.getTimeButtonPlusMinusStep(
      this.timeStructure.travelTime,
    );
    this.timeStructure.travelTime = Math.max(1, this.timeStructure.travelTime);
    this.highlightTravelTimeElement = false;
    this.onInputTravelTimeChanged();
  }

  updateTravelTimeChanged() {
    this.showWarningTwoLocks = false;
    this.roundAllTimes();

    if (!this.lockStructure.rightLock) {
      this.timeStructure.rightArrivalTime =
        this.timeStructure.leftDepartureTime + this.timeStructure.travelTime;
      this.timeStructure.rightArrivalTime +=
        this.timeStructure.rightArrivalTime < 0 ? 60 : 0;
      this.timeStructure.rightArrivalTime %= 60;
      this.timeStructure.rightDepartureTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.rightArrivalTime,
        );
    } else if (!this.lockStructure.leftLock) {
      this.timeStructure.leftArrivalTime =
        this.timeStructure.rightDepartureTime + this.timeStructure.travelTime;
      this.timeStructure.leftArrivalTime +=
        this.timeStructure.leftArrivalTime < 0 ? 60 : 0;
      this.timeStructure.leftArrivalTime %= 60;
      this.timeStructure.leftDepartureTime =
        TrainrunsectionHelper.getSymmetricTime(
          this.timeStructure.leftArrivalTime,
        );
    } else {
      this.showWarningTwoLocks = true;
    }
  }

  onInputTravelTimeChanged() {
    this.removeOffsetAndBackTransformTimeStructure();
    this.updateTravelTimeChanged();
    this.updateTrainrunSectionTime();
    this.applyOffsetAndTransformTimeStructure();
  }

  /* Lock */
  onButtonTravelTimeLock() {
    this.lockStructure.travelTimeLock = !this.lockStructure.travelTimeLock;
    this.setHighlightTravelTimeElement(false);
    this.onLockButtonClicked = true;
    this.updateTrainrunSectionTimeLock();
  }

  onButtonNodeLeftLock() {
    this.lockStructure.leftLock = !this.lockStructure.leftLock;
    this.onLockButtonClicked = true;
    this.updateTrainrunSectionTimeLock();
  }

  onButtonNodeRightLock() {
    this.lockStructure.rightLock = !this.lockStructure.rightLock;
    this.onLockButtonClicked = true;
    this.updateTrainrunSectionTimeLock();
  }

  updateTrainrunSectionTimeLock() {
    const leftRight =
      this.trainrunSectionHelper.getLeftRightSections(this.selectedTrainrunSection);

    this.trainrunSectionService.updateTrainrunSectionTimeLock(
      leftRight.leftSection.getId(),
      this.trainrunSectionHelper.getSourceLock(
        this.lockStructure,
        leftRight.leftSection,
      ),
      this.trainrunSectionHelper.getTargetLock(
        this.lockStructure,
        leftRight.leftSection,
      ),
      this.lockStructure.travelTimeLock,
      true
    );

    this.trainrunSectionService.updateTrainrunSectionTimeLock(
      leftRight.rightSection.getId(),
      this.trainrunSectionHelper.getSourceLock(
        this.lockStructure,
        leftRight.rightSection,
      ),
      this.trainrunSectionHelper.getTargetLock(
        this.lockStructure,
        leftRight.rightSection,
      ),
      undefined,
      true
    );
  }

  /* Buttons in Footer */
  onPropagateTimeLeft(trainrunSection: TrainrunSection) {
    const rightNodeId = this.trainrunSectionHelper
      .getRightNode(trainrunSection, this.nodesOrdered)
      .getId();
    this.trainrunSectionService.propagateTimeAlongTrainrun(
      trainrunSection.getId(),
      rightNodeId,
    );
    this.loadPerlenketteService.render();
  }

  onPropagateTimeRight(trainrunSection: TrainrunSection) {
    const leftNodeId = this.trainrunSectionHelper
      .getLeftNode(trainrunSection, this.nodesOrdered)
      .getId();
    this.trainrunSectionService.propagateTimeAlongTrainrun(
      trainrunSection.getId(),
      leftNodeId,
    );
    this.loadPerlenketteService.render();
  }

  applyOffsetAndTransformTimeStructure() {
    this.originalTimeStructure =
      this.trainrunSectionHelper.getLeftAndRightTimes(
        this.selectedTrainrunSection,
        this.nodesOrdered,
      );
    this.timeStructure = Object.assign({}, this.originalTimeStructure);

    const maxMinutes = 7 * 24 * 60;
    if (
      this.initialLeftAndRightElement === LeftAndRightElement.LeftDeparture ||
      this.initialLeftAndRightElement === LeftAndRightElement.RightArrival ||
      this.initialLeftAndRightElement ===
      LeftAndRightElement.LeftRightTrainrunName
    ) {
      this.timeStructure.leftDepartureTime = this.timeStructure.leftDepartureTime === null ? null :
        (this.timeStructure.leftDepartureTime + this.offset) % 60;
      this.timeStructure.rightArrivalTime = this.timeStructure.rightArrivalTime === null ? null :
        (this.timeStructure.rightArrivalTime + this.offset) % 60;
      this.timeStructure.leftArrivalTime = this.timeStructure.leftArrivalTime === null ? null :
        (maxMinutes + this.timeStructure.leftArrivalTime - this.offset) % 60;
      this.timeStructure.rightDepartureTime = this.timeStructure.rightDepartureTime === null ? null :
        (maxMinutes + this.timeStructure.rightDepartureTime - this.offset) % 60;
    } else {
      this.timeStructure.leftDepartureTime = this.timeStructure.leftDepartureTime === null ? null :
        (maxMinutes + this.timeStructure.leftDepartureTime - this.offset) % 60;
      this.timeStructure.rightArrivalTime = this.timeStructure.rightArrivalTime === null ? null :
        (maxMinutes + this.timeStructure.rightArrivalTime - this.offset) % 60;
      this.timeStructure.leftArrivalTime = this.timeStructure.leftArrivalTime === null ? null :
        (this.timeStructure.leftArrivalTime + this.offset) % 60;
      this.timeStructure.rightDepartureTime = this.timeStructure.rightDepartureTime === null ? null :
        (this.timeStructure.rightDepartureTime + this.offset) % 60;
    }
    this.offsetTransformationActive = true;
    this.fixAllTimesPrecision();
  }

  removeOffsetAndBackTransformTimeStructure() {
    const maxMinutes = 7 * 24 * 60;
    if (
      this.initialLeftAndRightElement === LeftAndRightElement.LeftDeparture ||
      this.initialLeftAndRightElement === LeftAndRightElement.RightArrival ||
      this.initialLeftAndRightElement ===
      LeftAndRightElement.LeftRightTrainrunName
    ) {
      this.timeStructure.leftDepartureTime =
        (maxMinutes + this.timeStructure.leftDepartureTime - this.offset) % 60;
      this.timeStructure.rightArrivalTime =
        (maxMinutes + this.timeStructure.rightArrivalTime - this.offset) % 60;
      this.timeStructure.leftArrivalTime =
        (this.timeStructure.leftArrivalTime + this.offset) % 60;
      this.timeStructure.rightDepartureTime =
        (this.timeStructure.rightDepartureTime + this.offset) % 60;
    } else {
      this.timeStructure.leftDepartureTime =
        (this.timeStructure.leftDepartureTime + this.offset) % 60;
      this.timeStructure.rightArrivalTime =
        (this.timeStructure.rightArrivalTime + this.offset) % 60;
      this.timeStructure.leftArrivalTime =
        (maxMinutes + this.timeStructure.leftArrivalTime - this.offset) % 60;
      this.timeStructure.rightDepartureTime =
        (maxMinutes + this.timeStructure.rightDepartureTime - this.offset) % 60;
    }
    this.originalTimeStructure =
      this.trainrunSectionHelper.getLeftAndRightTimes(
        this.selectedTrainrunSection,
        this.nodesOrdered,
      );
    this.offsetTransformationActive = false;
  }

  private roundAllTimes() {
    const timeDisplayPrecision = this.filterService.getTimeDisplayPrecision();
    this.timeStructure.leftArrivalTime = MathUtils.round(
      this.timeStructure.leftArrivalTime,
      timeDisplayPrecision,
    );
    this.timeStructure.leftDepartureTime = MathUtils.round(
      this.timeStructure.leftDepartureTime,
      timeDisplayPrecision,
    );
    this.timeStructure.rightArrivalTime = MathUtils.round(
      this.timeStructure.rightArrivalTime,
      timeDisplayPrecision,
    );
    this.timeStructure.rightDepartureTime = MathUtils.round(
      this.timeStructure.rightDepartureTime,
      timeDisplayPrecision,
    );
    this.timeStructure.travelTime = MathUtils.round(
      this.timeStructure.travelTime,
      timeDisplayPrecision,
    );
    // Populate travel time here, otherwise it'll be up to
    // setTimeStructureToTrainrunSections() and it may overwrite values entered
    // by the user
    const minTravelTime = 1.0 / Math.pow(10, this.filterService.getTimeDisplayPrecision());
    if (this.timeStructure.travelTime < 0.1) {
      this.timeStructure.travelTime = 0.1;
    }
  }

  private fixAllTimesPrecision() {
    const timeDisplayPrecision = 1000;
    const fixPrecision = (time) => {
      if (time === null) return null;
      return Math.round(time * timeDisplayPrecision) / timeDisplayPrecision;
    };
    this.timeStructure.leftArrivalTime = fixPrecision(this.timeStructure.leftArrivalTime);
    this.timeStructure.leftDepartureTime = fixPrecision(this.timeStructure.leftDepartureTime);
    this.timeStructure.rightArrivalTime = fixPrecision(this.timeStructure.rightArrivalTime);
    this.timeStructure.rightDepartureTime = fixPrecision(this.timeStructure.rightDepartureTime);
    this.timeStructure.travelTime = fixPrecision(this.timeStructure.travelTime);
  }

  private updateTrainrunSectionTime() {
    this.trainrunSectionService.setTimeStructureToTrainrunSections(
      this.trainrunSectionHelper.mapLeftAndRightTimes(
        this.selectedTrainrunSection,
        this.nodesOrdered,
        this.timeStructure,
      ),
      this.selectedTrainrunSection,
      this.filterService.getTimeDisplayPrecision()
    );
  }
}
