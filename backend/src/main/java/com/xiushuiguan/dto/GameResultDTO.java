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

    /** 是否首次通关该关卡 */
    private Boolean isFirstClear;

    // ===== 响应字段：奖励信息 =====

    /** 获得的金币数 */
    private Integer coinsEarned;

    /** 奖励提示消息 */
    private String rewardMessage;

    /** 用户当前总金币 */
    private Integer totalCoins;
}
