package com.xiushuiguan.dto;

import lombok.Data;

@Data
public class GameResultDTO {

    private Long userId;

    private Integer level;

    private Integer stars;

    private Integer timeUsed;

    private Boolean isWin;

    private String failReason;

    private Integer score;
}
