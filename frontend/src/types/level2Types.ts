export interface Level2Question {
    id: string;
    question: string;
    answer: string;
    isCorrect: boolean; // true if this question is relevant to the current picture
}

export interface Level2PictureData {
    pictureId: string;
    imageName: string;
    imageUrl: string;
    questions: Level2Question[];
    answers: Level2Question[]; // The 6 correct answers to display in the middle panel
    matchedQuestions: Set<string>; // IDs of correctly matched questions
    wrongAttempts: number;
}

export interface Level2GameState {
    currentPictureIndex: number;
    pictures: Level2PictureData[];
    score: number;
    elapsedTime: number; // in seconds
    isComplete: boolean;
}
